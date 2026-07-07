import type { PDFDocument } from "../../../shared/pdf/types.js";
import { escapeHtml } from "../renderers/base-renderer.js";

export function getWatermarkCss(doc: PDFDocument): string {
  const wmText = doc.metadata?.watermark;
  const wmOpacity = doc.metadata?.watermarkOpacity ?? 0.06;
  if (!wmText) {
    const wmSection = doc.sections.find(s => s.type === "watermark");
    if (!wmSection) return "";
    const text = wmSection.watermarkText || wmSection.content || "DRAFT";
    const opacity = wmSection.watermarkOpacity ?? 0.06;
    return `body::before {
      content: "${escapeHtml(text)}";
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 90px;
      font-weight: 900;
      font-family: Georgia, serif;
      color: rgba(15,23,42,${opacity});
      letter-spacing: 0.2em;
      z-index: -1;
      pointer-events: none;
      white-space: nowrap;
    }`;
  }
  return `body::before {
    content: "${escapeHtml(wmText)}";
    position: fixed;
    top: 45%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 90px;
    font-weight: 900;
    font-family: Georgia, serif;
    color: rgba(15,23,42,${wmOpacity});
    letter-spacing: 0.2em;
    z-index: -1;
    pointer-events: none;
    white-space: nowrap;
  }`;
}
