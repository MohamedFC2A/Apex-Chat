import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileDown, FileText, Loader2 } from "lucide-react";
import type { PDFDocument, PDFPageSize, PDFDocumentTheme } from "@shared/pdf";
import { estimatePdfPageCount, tryParseAnyPdfFromText } from "@shared/pdf";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useChatStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface PdfParseResult {
  document: PDFDocument | null;
  error: string | null;
}

function parsePdfDocument(rawText: string): PdfParseResult {
  try {
    const payload = tryParseAnyPdfFromText(rawText);
    if (!payload) {
      throw new Error("Invalid PDF document payload");
    }

    return {
      document: payload,
      error: null,
    };
  } catch (error) {
    return {
      document: null,
      error: error instanceof Error ? error.message : "Invalid PDF payload",
    };
  }
}

function getLanguageLabel(language: PDFDocument["language"]): string {
  switch (language) {
    case "ar":
      return "AR";
    case "en":
      return "EN";
    default:
      return "Mixed";
  }
}

async function downloadPdfBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function generateClientSidePrintHtml(doc: PDFDocument): string {
  const isDark = doc.theme === "dark";
  const bodyDirection = doc.language === "ar" ? "rtl" : "ltr";
  const isRtl = doc.language !== "en";

  const css = `
    :root {
      --page-bg: ${isDark ? "#0a0a0c" : "#fafafa"};
      --page-surface: ${isDark ? "#111217" : "#ffffff"};
      --text-main: ${isDark ? "#ebeef5" : "#172033"};
      --text-soft: ${isDark ? "#9aa4b2" : "#526074"};
      --border-soft: ${isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)"};
      --accent: #8b5cf6;
      --code-bg: ${isDark ? "#050506" : "#f1f5f9"};
      --quote-bg: ${isDark ? "rgba(139,92,246,0.08)" : "rgba(99,102,241,0.06)"};
    }
    * { box-sizing: border-box; }
    body {
      background: var(--page-bg);
      color: var(--text-main);
      font-family: 'Cairo', 'Inter', sans-serif;
      font-size: 14px;
      line-height: 1.85;
      margin: 0;
      padding: 40px 28px;
    }
    .cover-page {
      min-height: 85vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      border: 1px solid var(--border-soft);
      border-radius: 28px;
      padding: 50px 40px;
      margin-bottom: 40px;
      page-break-after: always;
      break-after: page;
      background: var(--page-surface);
      box-shadow: 0 10px 30px rgba(0,0,0,0.05);
    }
    .cover-page h1 { font-size: 2.5em; font-weight: 800; margin: 20px 0; color: var(--text-main); line-height: 1.3; }
    .cover-subtitle { font-size: 1.25em; color: var(--text-soft); margin-bottom: 30px; }
    .cover-meta { font-size: 0.9em; color: var(--text-soft); border-top: 1px solid var(--border-soft); padding-top: 20px; width: 100%; max-width: 400px; display: flex; justify-content: space-around; }
    .pdf-section { margin-bottom: 28px; }
    h1, h2, h3, h4 { color: var(--text-main); font-weight: 700; margin-top: 0; }
    h1 { font-size: 1.8em; border-bottom: 2px solid var(--accent); padding-bottom: 8px; margin-top: 30px; }
    h2 { font-size: 1.5em; margin-top: 24px; }
    h3 { font-size: 1.25em; }
    p { text-align: justify; color: var(--text-main); }
    .table-wrap { width: 100%; overflow-x: auto; margin: 20px 0; }
    table { width: 100%; border-collapse: collapse; background: var(--page-surface); border: 1px solid var(--border-soft); border-radius: 12px; }
    th, td { padding: 12px; border: 1px solid var(--border-soft); text-align: inherit; }
    th { background: var(--accent); color: white; font-weight: 600; }
    code { font-family: 'Courier New', Courier, monospace; background: var(--code-bg); padding: 2px 6px; border-radius: 6px; font-size: 0.9em; }
    pre { background: var(--code-bg); padding: 16px; border-radius: 12px; overflow-x: auto; border: 1px solid var(--border-soft); margin: 20px 0; }
    .callout { padding: 16px; border-radius: 12px; border-inline-start: 4px solid var(--accent); background: var(--page-surface); margin: 20px 0; border: 1px solid var(--border-soft); border-inline-start-width: 4px; }
    .qa-block { background: var(--page-surface); padding: 16px; border-radius: 12px; margin-bottom: 16px; border: 1px solid var(--border-soft); }
    .qa-question-row { font-weight: 700; color: var(--accent); margin-bottom: 8px; display: flex; gap: 8px; }
    .qa-answer-row { display: flex; gap: 8px; }
    .qa-badge { font-weight: 800; background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; }
    blockquote { font-style: italic; border-inline-start: 4px solid var(--border-soft); padding-inline-start: 16px; margin: 20px 0; color: var(--text-soft); }
    
    @media print {
      body { background: white; color: black; padding: 0; }
      .cover-page { border: none; min-height: 100%; box-shadow: none; }
    }
  `;

  let bodyContent = "";

  if (doc.coverPage) {
    bodyContent += `
      <div class="cover-page">
        <h1>${doc.title}</h1>
        ${doc.subtitle ? `<p class="cover-subtitle">${doc.subtitle}</p>` : ""}
        <div class="cover-meta">
          ${doc.author ? `<span>${doc.author}</span>` : ""}
          ${doc.date ? `<span>${doc.date}</span>` : ""}
          <span>${doc.pageSize.toUpperCase()}</span>
        </div>
      </div>
    `;
  }

  doc.sections.forEach((section) => {
    const sectionDir = section.direction || (doc.language === "ar" ? "rtl" : "ltr");
    bodyContent += `<div class="pdf-section" dir="${sectionDir}">`;

    switch (section.type) {
      case "heading":
        const lvl = section.level || 2;
        bodyContent += `<h${lvl}>${section.content}</h${lvl}>`;
        break;
      case "paragraph":
        bodyContent += `<p>${section.content}</p>`;
        break;
      case "code":
        bodyContent += `<pre><code>${section.content}</code></pre>`;
        break;
      case "math":
        bodyContent += `<div class="math-block">$$${section.content}$$</div>`;
        break;
      case "table":
        const headers = section.headers || [];
        const rows = section.rows || [];
        let thead = headers.length ? `<thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>` : "";
        let tbody = `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>`;
        bodyContent += `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
        break;
      case "list":
        const items = section.items || [];
        bodyContent += `<ul>${items.map(it => `<li>${it}</li>`).join("")}</ul>`;
        break;
      case "quote":
        bodyContent += `<blockquote>${section.content}</blockquote>`;
        break;
      case "callout":
        bodyContent += `<div class="callout"><div>${section.content}</div></div>`;
        break;
      case "qa":
        const qBadge = isRtl ? "س" : "Q";
        const aBadge = isRtl ? "ج" : "A";
        bodyContent += `
          <div class="qa-block">
            <div class="qa-question-row"><span class="qa-badge">${qBadge}</span> <span>${section.question}</span></div>
            <div class="qa-answer-row"><span class="qa-badge" style="background:#06b6d4;">${aBadge}</span> <span>${section.answer}</span></div>
          </div>
        `;
        break;
      default:
        bodyContent += `<p>${section.content}</p>`;
    }
    bodyContent += `</div>`;
  });

  return `
    <!DOCTYPE html>
    <html lang="${doc.language}" dir="${bodyDirection}">
      <head>
        <meta charset="UTF-8" />
        <title>${doc.title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Inter:wght@400;700&display=swap" rel="stylesheet">
        <style>${css}</style>
      </head>
      <body>
        ${bodyContent}
      </body>
    </html>
  `;
}

export function PDFExportWidget({ jsonText }: { jsonText: string }) {
  const parsed = useMemo(() => parsePdfDocument(jsonText), [jsonText]);
  const [documentState, setDocumentState] = useState<PDFDocument | null>(parsed.document);
  const [theme] = useState<"dark" | "light">(parsed.document?.theme === "light" ? "light" : "dark");
  const [pageSize] = useState<PDFPageSize>(parsed.document?.pageSize || "a4");
  const [includeCoverPage] = useState<boolean>(parsed.document?.coverPage ?? true);
  const [includeToc] = useState<boolean>(parsed.document?.tableOfContents ?? true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [, setProgress] = useState(0);
  const { toast } = useToast();

  // Sync state if jsonText prop changes from parent (e.g. streaming finished)
  useEffect(() => {
    if (parsed.document) {
      setDocumentState(parsed.document);
    }
  }, [parsed.document]);

  const [hasAutoDownloaded, setHasAutoDownloaded] = useState(false);

  // Auto-download PDF once generated and ready
  useEffect(() => {
    const doc = parsed.document;
    if (doc && !hasAutoDownloaded) {
      setHasAutoDownloaded(true);

      const autoTheme = doc.theme === "light" ? "light" : "dark";
      const autoPageSize = doc.pageSize || "a4";
      const autoCoverPage = doc.coverPage ?? true;
      const autoToc = doc.tableOfContents ?? true;

      const autoGenerate = async () => {
        setIsGenerating(true);
        setProgress(12);
        setTimeout(() => {
          useChatStore.getState().setActivePdfProgress({ current: 12, total: 100 });
        }, 0);
        const timer = window.setInterval(() => {
          setProgress((value) => {
            const nextVal = value >= 91 ? value : value + Math.floor(Math.random() * 14) + 3;
            setTimeout(() => {
              useChatStore.getState().setActivePdfProgress({ current: nextVal, total: 100 });
            }, 0);
            return nextVal;
          });
        }, 220);

        try {
          const payload = {
            exportType: "structured",
            document: {
              ...doc,
              theme: autoTheme,
              pageSize: autoPageSize,
              coverPage: autoCoverPage,
              tableOfContents: autoToc,
            },
            options: {
              theme: autoTheme,
              pageSize: autoPageSize,
            },
          };

          const response = await fetch("/api/export/pdf", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          const contentType = response.headers.get("content-type") || "";
          if (contentType.includes("text/html")) {
            // Static Hosting Fallback: print via browser dialog
            toast({
              title: doc.language !== "en" ? "تصدير مباشر عبر المتصفح" : "Browser Direct Export",
              description: doc.language !== "en"
                ? "سيتم فتح نافذة الطباعة الخاصة بالمتصفح تلقائياً. يرجى اختيار 'حفظ بتنسيق PDF'."
                : "Opening browser print dialog automatically. Select 'Save as PDF' to save.",
            });
            const printHtml = generateClientSidePrintHtml({
              ...doc,
              theme: autoTheme,
              pageSize: autoPageSize,
              coverPage: autoCoverPage,
              tableOfContents: autoToc,
            });
            const printWindow = window.open("", "_blank");
            if (printWindow) {
              printWindow.document.write(printHtml);
              printWindow.document.close();
              printWindow.focus();
              setTimeout(() => {
                printWindow.print();
              }, 1000);
            }
            return;
          }

          if (!response.ok) {
            const error = await response.json().catch(() => null);
            throw new Error(error?.message || `PDF export failed with status ${response.status}`);
          }

          const blob = await response.blob();
          const filename = `${doc.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "apex-document"}.pdf`;
          setProgress(100);
          setTimeout(() => {
            useChatStore.getState().setActivePdfProgress({ current: 100, total: 100 });
          }, 0);
          await downloadPdfBlob(blob, filename);
          toast({
            title: doc.language !== "en" ? "تم إنشاء وتنزيل ملف PDF تلقائياً" : "PDF generated and downloaded automatically",
            description: doc.language !== "en" ? "تم تنزيل المستند بنجاح." : "The file was downloaded successfully.",
          });
        } catch (error) {
          toast({
            title: doc.language !== "en" ? "فشل إنشاء PDF تلقائي" : "Auto PDF generation failed",
            description: error instanceof Error ? error.message : "Unknown error",
            variant: "destructive",
          });
        } finally {
          window.clearInterval(timer);
          setTimeout(() => {
            setIsGenerating(false);
            setProgress(0);
            setTimeout(() => {
              useChatStore.getState().setActivePdfProgress(null);
            }, 0);
          }, 300);
        }
      };

      autoGenerate();
    }
  }, [parsed.document, hasAutoDownloaded]);

  if (!documentState) {
    return (
      <div className="my-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-right font-arabic" dir="rtl">
        <p className="text-sm font-semibold text-rose-200">تعذر عرض مستند الـ PDF التفاعلي.</p>
        <p className="mt-1 text-sm text-zinc-300">صيغة `pdf-document` غير صالحة أو غير مكتملة.</p>
        {parsed.error && <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-left text-xs text-rose-100">{parsed.error}</pre>}
      </div>
    );
  }

  const document = documentState;
  const estimatedPages = estimatePdfPageCount({
    ...document,
    theme,
    pageSize,
    coverPage: includeCoverPage,
    tableOfContents: includeToc,
  });
  const isRtl = document.language !== "en";

  const handleGenerate = async () => {
    setIsGenerating(true);
    setProgress(12);
    setTimeout(() => {
      useChatStore.getState().setActivePdfProgress({ current: 12, total: 100 });
    }, 0);

    const timer = window.setInterval(() => {
      setProgress((value) => {
        const nextVal = value >= 91 ? value : value + Math.floor(Math.random() * 14) + 3;
        setTimeout(() => {
          useChatStore.getState().setActivePdfProgress({ current: nextVal, total: 100 });
        }, 0);
        return nextVal;
      });
    }, 220);

    try {
      const payload = {
        exportType: "structured",
        document: {
          ...document,
          theme,
          pageSize,
          coverPage: includeCoverPage,
          tableOfContents: includeToc,
        },
        options: {
          theme,
          pageSize,
        },
      };

      const response = await fetch("/api/export/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("text/html")) {
        // Static Hosting Fallback: print via browser dialog
        toast({
          title: isRtl ? "تصدير مباشر عبر المتصفح" : "Browser Direct Export",
          description: isRtl
            ? "سيتم فتح نافذة الطباعة الخاصة بالمتصفح تلقائياً. يرجى اختيار 'حفظ بتنسيق PDF'."
            : "Opening browser print dialog automatically. Select 'Save as PDF' to save.",
        });
        const printHtml = generateClientSidePrintHtml({
          ...document,
          theme,
          pageSize,
          coverPage: includeCoverPage,
          tableOfContents: includeToc,
        });
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(printHtml);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 1000);
        } else {
          throw new Error(
            isRtl
              ? "تعذر فتح نافذة الطباعة. يرجى السماح بالنوافذ المنبثقة (Popups) في متصفحك."
              : "Could not open print window. Please allow popups in your browser settings."
          );
        }
        return;
      }

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || `PDF export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const filename = `${document.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "apex-document"}.pdf`;
      setProgress(100);
      setTimeout(() => {
        useChatStore.getState().setActivePdfProgress({ current: 100, total: 100 });
      }, 0);
      await downloadPdfBlob(blob, filename);
      toast({
        title: isRtl ? "تم إنشاء ملف PDF" : "PDF generated",
        description: isRtl ? "تم تنزيل الملف بنجاح." : "The file was downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: isRtl ? "فشل إنشاء PDF" : "PDF generation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      window.clearInterval(timer);
      setTimeout(() => {
        setIsGenerating(false);
        setProgress(0);
        setTimeout(() => {
          useChatStore.getState().setActivePdfProgress(null);
        }, 0);
      }, 300);
    }
  };

  return (
    <motion.div
      className="my-4 overflow-hidden rounded-3xl border border-zinc-800/80 dark:border-zinc-900/80 bg-gradient-to-br from-zinc-950/90 via-zinc-950/95 to-violet-950/10 shadow-lg"
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

      <div className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4 min-w-0">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-400">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-bold text-zinc-50">{document.title}</h3>
                <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-300">
                  {getLanguageLabel(document.language)}
                </span>
              </div>
              {document.subtitle && <p className="mt-1 text-sm text-zinc-400">{document.subtitle}</p>}
              <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-arabic">
                  {estimatedPages} {isRtl ? "صفحات تقريبًا" : "estimated pages"}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-arabic">
                  {document.sections.length} {isRtl ? "أقسام" : "sections"}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-900/50 px-3 py-1 font-mono">
                  {pageSize.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 items-center w-full sm:w-auto">
            <Button
              className="w-full sm:w-auto px-6 py-4.5 rounded-xl bg-violet-600 text-white font-bold text-sm shadow-[0_4px_15px_rgba(139,92,246,0.2)] hover:bg-violet-500 hover:shadow-[0_6px_25px_rgba(139,92,246,0.35)] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2 border border-violet-500/30 font-arabic"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>{isRtl ? "جاري الحفظ والتنزيل..." : "Compiling & downloading..."}</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4.5 w-4.5" />
                  <span>{isRtl ? "تنزيل المستند بصيغة PDF" : "Download PDF Document"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
