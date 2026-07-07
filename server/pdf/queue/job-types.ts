/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Job Types v4.0                                                ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { PDFDocument, PdfProgressEvent } from "../../../shared/pdf/types.js";

export type JobPriority = "high" | "normal" | "low";

export interface PdfJob {
  id: string;
  document: PDFDocument;
  priority: JobPriority;
  overrides?: Partial<Pick<PDFDocument, "theme" | "pageSize">>;
  createdAt: number;
  resolve: (buffer: Buffer) => void;
  reject: (error: Error) => void;
  onProgress?: (event: PdfProgressEvent) => void;
}

export type JobStatus = "queued" | "rendering" | "printing" | "complete" | "error";

export interface JobStatusInfo {
  id: string;
  status: JobStatus;
  progress: number;
  queuePosition?: number;
  createdAt: number;
  completedAt?: number;
  error?: string;
}
