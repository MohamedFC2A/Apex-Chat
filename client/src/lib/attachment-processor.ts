import { createWorker, PSM, type Worker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

type AttachmentKind = "image" | "pdf";
type ExtractionMethod = "pdf-text" | "ocr" | "pdf-text+ocr";

export interface AttachmentExtraction {
  id: string;
  fileName: string;
  mimeType: string;
  kind: AttachmentKind;
  method: ExtractionMethod;
  languageHint: "ar" | "en" | "mixed" | "unknown";
  pageCount?: number;
  confidence?: number;
  text: string;
  warnings: string[];
}

export type AttachmentProgress = {
  fileName: string;
  stage: "reading" | "pdf" | "ocr" | "finalizing";
  progress: number;
};

export interface OcrConfig {
  mode: "auto" | "ocr_only" | "text_only" | "hybrid";
  language: string;
  scale: number;
  psm: string;
  contrastStretch: boolean;
  adaptiveThreshold: boolean;
  sharpen: boolean;
}

export const DEFAULT_OCR_CONFIG: OcrConfig = {
  mode: "auto",
  language: "eng+ara",
  scale: 2.0,
  psm: "3", // PSM.AUTO = "3"
  contrastStretch: true,
  adaptiveThreshold: true,
  sharpen: true,
};

const MAX_FILES = 6;
const MAX_FILE_BYTES = 18 * 1024 * 1024;
const MAX_PDF_PAGES = 16;
const MAX_TEXT_PER_FILE = 8000;
const MAX_TOTAL_TEXT = 22000;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

// Reusable Worker Pool for Concurrent OCR
class OcrWorkerPool {
  private workers: Worker[] = [];
  private currentLanguage: string = "";
  private initializingPromise: Promise<void> | null = null;

  async getWorkers(language: string, concurrency: number = 2): Promise<Worker[]> {
    if (this.currentLanguage !== language) {
      await this.terminate();
      this.currentLanguage = language;
      this.initializingPromise = this.initWorkers(language, concurrency);
    }
    if (this.initializingPromise) {
      await this.initializingPromise;
    }
    return this.workers;
  }

  private async initWorkers(language: string, concurrency: number): Promise<void> {
    const promises: Promise<Worker>[] = [];
    for (let i = 0; i < concurrency; i++) {
      promises.push(
        createWorker(language, 1, {
          logger: () => {},
        })
      );
    }
    this.workers = await Promise.all(promises);
  }

  async terminate(): Promise<void> {
    this.initializingPromise = null;
    const activeWorkers = this.workers;
    this.workers = [];
    if (activeWorkers.length > 0) {
      await Promise.all(activeWorkers.map((w) => w.terminate()));
    }
  }
}

const globalWorkerPool = new OcrWorkerPool();

// Run OCR on multiple canvases concurrently using the worker pool
async function runOcrOnCanvases(
  canvases: { canvas: HTMLCanvasElement; name: string }[],
  config: OcrConfig,
  onProgress: ((progress: AttachmentProgress) => void) | undefined = undefined,
  file: File
): Promise<{ text: string; confidence: number }[]> {
  // Use up to 2 workers for parallel page scanning
  const concurrency = Math.min(2, canvases.length);
  const workers = await globalWorkerPool.getWorkers(config.language, concurrency);

  await Promise.all(
    workers.map((w) =>
      w.setParameters({
        tessedit_pageseg_mode: config.psm as PSM,
        preserve_interword_spaces: "1",
      })
    )
  );

  let completed = 0;
  const total = canvases.length;
  const results = new Array<{ text: string; confidence: number }>(total);

  // Queue of tasks
  const queue = canvases.map((item, index) => ({ item, index }));

  async function workerTask(worker: Worker) {
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;

      const { item, index } = task;

      onProgress?.({
        fileName: file.name,
        stage: "ocr",
        progress: Math.round(((completed + 0.1) / total) * 90),
      });

      const result = await worker.recognize(item.canvas);

      completed++;
      onProgress?.({
        fileName: file.name,
        stage: "ocr",
        progress: Math.round((completed / total) * 90),
      });

      results[index] = {
        text: result.data.text || "",
        confidence: result.data.confidence || 0,
      };
    }
  }

  // Run tasks across workers in parallel
  const activeWorkers = workers.slice(0, Math.min(workers.length, total));
  await Promise.all(activeWorkers.map((w) => workerTask(w)));

  return results;
}

export async function processChatAttachments(
  files: File[],
  onProgress: ((progress: AttachmentProgress) => void) | undefined = undefined,
  config: OcrConfig = DEFAULT_OCR_CONFIG
): Promise<AttachmentExtraction[]> {
  const accepted = files.slice(0, MAX_FILES);
  const results: AttachmentExtraction[] = [];

  for (const file of accepted) {
    if (file.size > MAX_FILE_BYTES) {
      results.push({
        id: crypto.randomUUID(),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        kind: file.type === "application/pdf" ? "pdf" : "image",
        method: "ocr",
        languageHint: "unknown",
        text: "",
        warnings: [`File skipped because it is larger than ${Math.round(MAX_FILE_BYTES / 1024 / 1024)}MB.`],
      });
      continue;
    }

    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      results.push(await processPdf(file, onProgress, config));
    } else if (file.type.startsWith("image/")) {
      results.push(await processImage(file, onProgress, config));
    } else {
      results.push({
        id: crypto.randomUUID(),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        kind: "image",
        method: "ocr",
        languageHint: "unknown",
        text: "",
        warnings: ["Unsupported file type. Supported formats: PDF and images."],
      });
    }
  }

  return results;
}

export function buildAttachmentPrompt(userMessage: string, attachments: AttachmentExtraction[]): string {
  const evidence = attachments
    .map((item, index) => {
      const clipped = clipText(item.text || "", MAX_TEXT_PER_FILE);
      const warnings = item.warnings.length ? `\nWarnings: ${item.warnings.join(" | ")}` : "";
      return `[#${index + 1}] File: ${item.fileName}
Type: ${item.mimeType}
Kind: ${item.kind}
Extraction: ${item.method}
Language: ${item.languageHint}
Pages: ${item.pageCount || 1}
OCR confidence: ${item.confidence != null ? `${Math.round(item.confidence)}%` : "n/a"}${warnings}
Extracted text:
${clipped || "[No readable text extracted]"}
`;
    })
    .join("\n---\n");

  return `${userMessage}

=== ATTACHMENT_EVIDENCE_PROTOCOL ===
The user attached files. Use the extracted attachment evidence below as primary context.
Rules:
1. Answer from the extracted text when the question asks about the files.
2. If a detail is not present in the extracted text, say clearly that it was not found in the attachment.
3. Do not invent names, numbers, dates, totals, signatures, or clauses.
4. Respect Arabic and English text. If the user asks in Arabic, answer in Arabic.
5. OCR may contain mistakes; mention uncertainty when the extracted text is unclear.
6. Cite file names and page numbers when available.

=== ATTACHMENT_EVIDENCE_START ===
${clipText(evidence, MAX_TOTAL_TEXT)}
=== ATTACHMENT_EVIDENCE_END ===`;
}

async function processImage(
  file: File,
  onProgress: ((progress: AttachmentProgress) => void) | undefined = undefined,
  config: OcrConfig = DEFAULT_OCR_CONFIG
): Promise<AttachmentExtraction> {
  onProgress?.({ fileName: file.name, stage: "reading", progress: 5 });
  const canvas = await fileToPreprocessedCanvas(file, config.scale, config);

  onProgress?.({ fileName: file.name, stage: "ocr", progress: 20 });
  const workers = await globalWorkerPool.getWorkers(config.language, 1);
  const worker = workers[0];

  await worker.setParameters({
    tessedit_pageseg_mode: config.psm as PSM,
    preserve_interword_spaces: "1",
  });

  const result = await worker.recognize(canvas);
  onProgress?.({ fileName: file.name, stage: "ocr", progress: 95 });

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "image/*",
    kind: "image",
    method: "ocr",
    languageHint: detectLanguage(result.data.text || ""),
    confidence: result.data.confidence,
    text: normalizeExtractedText(result.data.text || ""),
    warnings: (result.data.text || "").trim().length < 20 ? ["OCR extracted very little text from this image."] : [],
  };
}

async function processPdf(
  file: File,
  onProgress: ((progress: AttachmentProgress) => void) | undefined = undefined,
  config: OcrConfig = DEFAULT_OCR_CONFIG
): Promise<AttachmentExtraction> {
  const warnings: string[] = [];
  onProgress?.({ fileName: file.name, stage: "reading", progress: 5 });
  const data = new Uint8Array(await file.arrayBuffer());
  onProgress?.({ fileName: file.name, stage: "pdf", progress: 10 });
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PDF_PAGES);
  if (pdf.numPages > MAX_PDF_PAGES) {
    warnings.push(`Only the first ${MAX_PDF_PAGES} pages were processed to control context size.`);
  }

  const pageOutputs: { pageNumber: number; text: string; method: ExtractionMethod }[] = [];
  let ocrPages = 0;
  let confidenceTotal = 0;

  // We will collect pages that need OCR
  interface OcrTask {
    pageNumber: number;
    canvas: HTMLCanvasElement;
    digitalText?: string;
  }
  const ocrTasks: OcrTask[] = [];

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
    const page = await pdf.getPage(pageNumber);

    // 1. Digital text extraction (skip if OCR_ONLY)
    let digitalText = "";
    if (config.mode !== "ocr_only") {
      const textContent = await page.getTextContent();
      digitalText = normalizeExtractedText(
        textContent.items.map((item: any) => String(item.str || "")).join(" ")
      );
    }

    // 2. Decide if OCR is needed for this page
    let needsOcr = false;
    if (config.mode === "ocr_only" || config.mode === "hybrid") {
      needsOcr = true;
    } else if (config.mode === "auto") {
      needsOcr = digitalText.length < 80;
    } else if (config.mode === "text_only") {
      needsOcr = false;
    }

    if (needsOcr) {
      const canvas = await renderPdfPageToCanvas(page, config.scale, config);
      ocrTasks.push({ pageNumber, canvas, digitalText });
    } else {
      pageOutputs.push({
        pageNumber,
        text: `[Page ${pageNumber}]\n${digitalText || "[No readable text extracted]"}`,
        method: "pdf-text",
      });
    }
  }

  // Run OCR on the tasks in parallel
  if (ocrTasks.length > 0) {
    const canvasesToProcess = ocrTasks.map((t) => ({
      canvas: t.canvas,
      name: `${file.name} page ${t.pageNumber}`,
    }));

    const ocrResults = await runOcrOnCanvases(canvasesToProcess, config, onProgress, file);

    for (let i = 0; i < ocrTasks.length; i++) {
      const task = ocrTasks[i];
      const result = ocrResults[i];
      confidenceTotal += result.confidence;
      ocrPages += 1;

      const ocrText = normalizeExtractedText(result.text);

      let finalPageText = "";
      let methodUsed: ExtractionMethod = "ocr";

      if (config.mode === "hybrid" && task.digitalText) {
        finalPageText = `[Page ${task.pageNumber} | Digital Text]\n${task.digitalText}\n\n[Page ${task.pageNumber} | OCR Scan]\n${ocrText || "[No readable text extracted]"}`;
        methodUsed = "pdf-text+ocr";
      } else {
        finalPageText = `[Page ${task.pageNumber} | OCR]\n${ocrText || "[No readable text extracted]"}`;
      }

      pageOutputs.push({
        pageNumber: task.pageNumber,
        text: finalPageText,
        method: methodUsed,
      });
    }
  }

  // Sort pageOutputs by pageNumber to guarantee logical order
  pageOutputs.sort((a, b) => a.pageNumber - b.pageNumber);
  const combinedText = pageOutputs.map((po) => po.text).join("\n\n");

  onProgress?.({ fileName: file.name, stage: "finalizing", progress: 100 });

  // Determine overall method
  let method: ExtractionMethod = "pdf-text";
  const usedMethods = new Set(pageOutputs.map((po) => po.method));
  if (usedMethods.has("pdf-text") && (usedMethods.has("ocr") || usedMethods.has("pdf-text+ocr"))) {
    method = "pdf-text+ocr";
  } else if (usedMethods.has("ocr") || usedMethods.has("pdf-text+ocr")) {
    method = "ocr";
  }

  return {
    id: crypto.randomUUID(),
    fileName: file.name,
    mimeType: file.type || "application/pdf",
    kind: "pdf",
    method,
    languageHint: detectLanguage(combinedText),
    pageCount: pdf.numPages,
    confidence: ocrPages ? confidenceTotal / ocrPages : undefined,
    text: combinedText,
    warnings,
  };
}

async function fileToPreprocessedCanvas(
  file: File,
  scaleConfig: number = 2.0,
  config: OcrConfig = DEFAULT_OCR_CONFIG
): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(3.5, Math.max(1, (1800 * (scaleConfig / 2.0)) / Math.max(bitmap.width, bitmap.height)));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available for OCR preprocessing.");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  enhanceCanvasForOcr(canvas, config);
  bitmap.close();
  return canvas;
}

async function renderPdfPageToCanvas(
  page: any,
  scale: number = 2.0,
  config: OcrConfig = DEFAULT_OCR_CONFIG
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas is not available for PDF OCR rendering.");
  await page.render({ canvasContext: ctx, viewport }).promise;
  enhanceCanvasForOcr(canvas, config);
  return canvas;
}

function enhanceCanvasForOcr(canvas: HTMLCanvasElement, config: OcrConfig): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const len = data.length;

  // 1. Convert to Grayscale
  const gray = new Uint8ClampedArray(width * height);
  for (let i = 0; i < len; i += 4) {
    gray[i / 4] = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
  }

  // 2. Linear Contrast Stretching (Min-Max normalization)
  if (config.contrastStretch) {
    let min = 255;
    let max = 0;
    for (let i = 0; i < gray.length; i++) {
      const g = gray[i];
      if (g < min) min = g;
      if (g > max) max = g;
    }
    if (max > min) {
      const range = max - min;
      for (let i = 0; i < gray.length; i++) {
        gray[i] = Math.round(((gray[i] - min) / range) * 255);
      }
    }
  }

  // 3. Unsharp Masking (Sharpening convolution matrix)
  let processedGray = gray;
  if (config.sharpen) {
    processedGray = new Uint8ClampedArray(width * height);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        const val =
          5 * gray[idx] -
          gray[idx - 1] -
          gray[idx + 1] -
          gray[idx - width] -
          gray[idx + width];
        processedGray[idx] = Math.max(0, Math.min(255, val));
      }
    }
    // Copy borders
    for (let x = 0; x < width; x++) {
      processedGray[x] = gray[x];
      processedGray[(height - 1) * width + x] = gray[(height - 1) * width + x];
    }
    for (let y = 0; y < height; y++) {
      processedGray[y * width] = gray[y * width];
      processedGray[y * width + (width - 1)] = gray[y * width + (width - 1)];
    }
  }

  // 4. Binarization / Contrast Binarization
  if (config.adaptiveThreshold) {
    // Bradley-Roth Local Adaptive Thresholding using Integral Image
    const integral = new Float64Array(width * height);
    for (let y = 0; y < height; y++) {
      let sum = 0;
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        sum += processedGray[idx];
        if (y === 0) {
          integral[idx] = sum;
        } else {
          integral[idx] = integral[idx - width] + sum;
        }
      }
    }

    const S = Math.max(8, Math.round(width / 16));
    const halfS = Math.round(S / 2);
    const T = 0.15;

    const binary = new Uint8ClampedArray(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        const x1 = Math.max(0, x - halfS);
        const x2 = Math.min(width - 1, x + halfS);
        const y1 = Math.max(0, y - halfS);
        const y2 = Math.min(height - 1, y + halfS);

        const count = (x2 - x1 + 1) * (y2 - y1 + 1);

        const idxTR = y1 * width + x2;
        const idxBL = y2 * width + x1;
        const idxBR = y2 * width + x2;
        const idxTL = y1 * width + x1;

        let sum = integral[idxBR];
        if (x1 > 0) sum -= integral[idxBL - 1];
        if (y1 > 0) sum -= integral[idxTR - width];
        if (x1 > 0 && y1 > 0) sum += integral[idxTL - width - 1];

        const mean = sum / count;
        binary[idx] = processedGray[idx] < mean * (1 - T) ? 0 : 255;
      }
    }

    for (let i = 0; i < len; i += 4) {
      const val = binary[i / 4];
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  } else {
    for (let i = 0; i < len; i += 4) {
      const g = processedGray[i / 4];
      const val = g < 170 ? Math.max(0, g - 32) : Math.min(255, g + 28);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function detectLanguage(text: string): AttachmentExtraction["languageHint"] {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  if (arabic > 20 && latin > 20) return "mixed";
  if (arabic > 20) return "ar";
  if (latin > 20) return "en";
  return "unknown";
}

function normalizeExtractedText(text: string): string {
  return String(text || "")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clipText(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars)}\n[... clipped ${text.length - maxChars} characters to protect model context ...]`;
}
