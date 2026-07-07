/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX PDF — Progress Emitter v4.0 (Server-Sent Events)                   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import type { Response } from "express";
import type { PdfProgressEvent } from "../../../shared/pdf/types.js";

export function initSseResponse(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

export function emitPdfProgress(res: Response, event: PdfProgressEvent): void {
  if (res.writableEnded) return;
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

export function closeSseResponse(res: Response): void {
  if (!res.writableEnded) {
    res.write("data: [DONE]\n\n");
    res.end();
  }
}
