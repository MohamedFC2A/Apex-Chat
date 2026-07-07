/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Job Queue v4.0 (Priority Queue + Observer Pattern)           ║
 * ║  Handles up to MAX_CONCURRENT PDF jobs in parallel                       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import { randomUUID } from "crypto";
import type { PDFDocument, PdfProgressEvent } from "../../../shared/pdf/types.js";
import type { PdfJob, JobPriority, JobStatusInfo } from "./job-types.js";

const MAX_CONCURRENT = 3;
const PRIORITY_ORDER: Record<JobPriority, number> = { high: 0, normal: 1, low: 2 };

class PdfJobQueue {
  private queue: PdfJob[] = [];
  private running = 0;
  private statusMap = new Map<string, JobStatusInfo>();
  private progressListeners = new Map<string, Array<(event: PdfProgressEvent) => void>>();

  async enqueue(
    document: PDFDocument,
    options: {
      priority?: JobPriority;
      overrides?: PdfJob["overrides"];
    } = {},
  ): Promise<Buffer> {
    return this.enqueueWithId(document, options).promise;
  }

  enqueueWithId(
    document: PDFDocument,
    options: {
      priority?: JobPriority;
      overrides?: PdfJob["overrides"];
    } = {},
  ): { id: string; promise: Promise<Buffer> } {
    const id = randomUUID();
    const promise = new Promise<Buffer>((resolve, reject) => {
      const job: PdfJob = {
        id,
        document,
        priority: options.priority || "normal",
        overrides: options.overrides,
        createdAt: Date.now(),
        resolve,
        reject,
        onProgress: (event) => {
          const listeners = this.progressListeners.get(id) || [];
          listeners.forEach((fn) => fn(event));
        },
      };

      // Track status
      this.statusMap.set(id, {
        id, status: "queued", progress: 0,
        queuePosition: this.queue.length + 1,
        createdAt: Date.now(),
      });

      // Insert by priority
      const insertIdx = this.queue.findIndex(
        (j) => PRIORITY_ORDER[j.priority] > PRIORITY_ORDER[job.priority],
      );
      if (insertIdx === -1) {
        this.queue.push(job);
      } else {
        this.queue.splice(insertIdx, 0, job);
      }

      this._processNext();
    });

    return { id, promise };
  }


  private completedBuffers = new Map<string, Buffer>();

  getCompletedBuffer(jobId: string): Buffer | undefined {
    return this.completedBuffers.get(jobId);
  }

  onProgress(jobId: string, listener: (event: PdfProgressEvent) => void): () => void {
    const listeners = this.progressListeners.get(jobId) || [];
    listeners.push(listener);
    this.progressListeners.set(jobId, listeners);
    // Return unsubscribe function
    return () => {
      const current = this.progressListeners.get(jobId) || [];
      this.progressListeners.set(jobId, current.filter((l) => l !== listener));
    };
  }

  getStatus(jobId: string): JobStatusInfo | undefined {
    return this.statusMap.get(jobId);
  }

  get queueLength(): number { return this.queue.length; }
  get runningCount(): number { return this.running; }

  private _updateStatus(jobId: string, update: Partial<JobStatusInfo>): void {
    const existing = this.statusMap.get(jobId);
    if (existing) this.statusMap.set(jobId, { ...existing, ...update });
  }

  private async _processNext(): Promise<void> {
    if (this.running >= MAX_CONCURRENT || this.queue.length === 0) return;

    const job = this.queue.shift()!;
    this.running++;
    this._updateStatus(job.id, { status: "rendering", progress: 10 });
    job.onProgress?.({ jobId: job.id, stage: "rendering", progress: 10 });

    try {
      // Dynamic import to avoid circular deps
      const { generatePdfDocument } = await import("../index.js");
      this._updateStatus(job.id, { status: "printing", progress: 60 });
      job.onProgress?.({ jobId: job.id, stage: "printing", progress: 60 });

      const buffer = await generatePdfDocument(job.document, job.overrides);
      this.completedBuffers.set(job.id, buffer);

      // Clean up oldest buffers if capacity exceeded (keep last 30)
      if (this.completedBuffers.size > 30) {
        const oldestId = this.completedBuffers.keys().next().value;
        if (oldestId !== undefined) {
          this.completedBuffers.delete(oldestId);
        }
      }

      this._updateStatus(job.id, { status: "complete", progress: 100, completedAt: Date.now() });
      job.onProgress?.({ jobId: job.id, stage: "complete", progress: 100 });
      job.resolve(buffer);
    } catch (err) {
      const error = err as Error;
      this._updateStatus(job.id, { status: "error", progress: 0, error: error.message, completedAt: Date.now() });
      job.onProgress?.({ jobId: job.id, stage: "error", progress: 0, error: error.message });
      job.reject(error);
    } finally {
      this.running--;
      this.progressListeners.delete(job.id);
      // Clean up old status entries (keep last 100)
      if (this.statusMap.size > 100) {
        const oldest = Array.from(this.statusMap.entries())
          .filter(([, s]) => s.status === "complete" || s.status === "error")
          .sort((a, b) => (a[1].completedAt || 0) - (b[1].completedAt || 0))
          .slice(0, 10);
        oldest.forEach(([id]) => this.statusMap.delete(id));
      }
      this._processNext();
    }
  }
}

export const pdfJobQueue = new PdfJobQueue();
