import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Eye, FileDown, FileText, Languages, Loader2, Moon, RefreshCcw, Sun } from "lucide-react";
import type { PDFDocument, PDFPageSize, PDFDocumentTheme } from "@shared/pdf";
import { estimatePdfPageCount } from "@shared/pdf";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PdfParseResult {
  document: PDFDocument | null;
  error: string | null;
}

function parsePdfDocument(rawText: string): PdfParseResult {
  try {
    const cleaned = rawText
      .replace(/^```pdf-document\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const payload = JSON.parse(cleaned) as PDFDocument;
    if (!payload?.title || !Array.isArray(payload.sections) || payload.sections.length === 0) {
      throw new Error("Invalid PDF document payload");
    }

    return {
      document: {
        ...payload,
        theme: payload.theme || "dark",
        pageSize: payload.pageSize || "a4",
        coverPage: payload.coverPage ?? true,
        tableOfContents: payload.tableOfContents ?? true,
      },
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

function summarizeSections(doc: PDFDocument) {
  return doc.sections.reduce<Record<string, number>>((acc, section) => {
    acc[section.type] = (acc[section.type] || 0) + 1;
    return acc;
  }, {});
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

export function PDFExportWidget({ jsonText }: { jsonText: string }) {
  const parsed = useMemo(() => parsePdfDocument(jsonText), [jsonText]);
  const [theme, setTheme] = useState<"dark" | "light">(parsed.document?.theme === "light" ? "light" : "dark");
  const [pageSize, setPageSize] = useState<PDFPageSize>(parsed.document?.pageSize || "a4");
  const [includeCoverPage, setIncludeCoverPage] = useState<boolean>(parsed.document?.coverPage ?? true);
  const [includeToc, setIncludeToc] = useState<boolean>(parsed.document?.tableOfContents ?? true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  if (!parsed.document) {
    return (
      <div className="my-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-right font-arabic" dir="rtl">
        <p className="text-sm font-semibold text-rose-200">تعذر عرض مستند الـ PDF التفاعلي.</p>
        <p className="mt-1 text-sm text-zinc-300">صيغة `pdf-document` غير صالحة أو غير مكتملة.</p>
        {parsed.error && <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-left text-xs text-rose-100">{parsed.error}</pre>}
      </div>
    );
  }

  const document = parsed.document;
  const sectionSummary = summarizeSections(document);
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

    const timer = window.setInterval(() => {
      setProgress((value) => (value >= 91 ? value : value + Math.floor(Math.random() * 14) + 3));
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

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || `PDF export failed with status ${response.status}`);
      }

      const blob = await response.blob();
      const filename = `${document.title.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "apex-document"}.pdf`;
      setProgress(100);
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
      }, 300);
    }
  };

  return (
    <>
      <motion.div
        className="my-4 overflow-hidden rounded-3xl border border-violet-500/20 bg-gradient-to-br from-zinc-950/95 via-zinc-950/85 to-cyan-950/20 shadow-[0_20px_70px_rgba(139,92,246,0.08)]"
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div className="h-px bg-gradient-to-r from-transparent via-violet-400/50 to-transparent" />

        <div className="p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4 min-w-0">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-violet-500/20 bg-violet-500/10 text-violet-200">
                <FileText className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-lg font-bold text-zinc-50">{document.title}</h3>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200">
                    {getLanguageLabel(document.language)}
                  </span>
                </div>
                {document.subtitle && <p className="mt-1 text-sm text-zinc-400">{document.subtitle}</p>}
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    {estimatedPages} {isRtl ? "صفحات تقريبًا" : "estimated pages"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    {document.sections.length} {isRtl ? "أقسام" : "sections"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">
                    {pageSize.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 text-zinc-300 hover:bg-white/[0.06]"
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="me-2 h-4 w-4" />
                {isRtl ? "معاينة" : "Preview"}
              </Button>
              <Button
                className="rounded-xl bg-white text-black hover:bg-zinc-200"
                onClick={handleGenerate}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <FileDown className="me-2 h-4 w-4" />}
                {isGenerating ? (isRtl ? "جاري الإنشاء" : "Generating") : (isRtl ? "إنشاء PDF" : "Generate PDF")}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{isRtl ? "الثيم" : "Theme"}</p>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                <span className="text-sm text-zinc-200">{theme === "dark" ? (isRtl ? "داكن" : "Dark") : isRtl ? "فاتح" : "Light"}</span>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.08]"
                  onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
                >
                  {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{isRtl ? "حجم الصفحة" : "Page size"}</p>
              <Select value={pageSize} onValueChange={(value) => setPageSize(value as PDFPageSize)}>
                <SelectTrigger className="mt-2 border-white/10 bg-black/20 text-zinc-100">
                  <SelectValue placeholder="A4" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{isRtl ? "صفحة الغلاف" : "Cover page"}</p>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <span className="text-sm text-zinc-200">{includeCoverPage ? (isRtl ? "مفعلة" : "Enabled") : (isRtl ? "معطلة" : "Disabled")}</span>
                <Switch checked={includeCoverPage} onCheckedChange={setIncludeCoverPage} />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{isRtl ? "الفهرس" : "TOC"}</p>
              <div className="mt-2 flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-3">
                <span className="text-sm text-zinc-200">{includeToc ? (isRtl ? "مفعّل" : "Enabled") : (isRtl ? "معطّل" : "Disabled")}</span>
                <Switch checked={includeToc} onCheckedChange={setIncludeToc} />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(sectionSummary).map(([type, count]) => (
              <div key={type} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{type}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-lg font-bold text-zinc-100">{count}</span>
                  <Languages className="h-4 w-4 text-zinc-500" />
                </div>
              </div>
            ))}
          </div>

          {isGenerating && (
            <div className="mt-5 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
              <div className="mb-2 flex items-center justify-between text-sm text-zinc-200">
                <span>{isRtl ? "جاري توليد الملف" : "Generating file"}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/5" />
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              variant="ghost"
              className="rounded-xl border border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
              onClick={() => {
                setTheme(document.theme === "light" ? "light" : "dark");
                setPageSize(document.pageSize || "a4");
                setIncludeCoverPage(document.coverPage ?? true);
                setIncludeToc(document.tableOfContents ?? true);
              }}
            >
              <RefreshCcw className="me-2 h-4 w-4" />
              {isRtl ? "إعادة الضبط" : "Reset"}
            </Button>
          </div>
        </div>
      </motion.div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto border-white/10 bg-zinc-950 text-zinc-100 sm:max-w-3xl">
          <DialogHeader className={cn(isRtl ? "text-right font-arabic" : "text-left")}>
            <DialogTitle className="text-xl">{document.title}</DialogTitle>
            <DialogDescription className="text-zinc-400">
              {document.subtitle || (isRtl ? "معاينة بنية المستند قبل التصدير." : "Preview the document structure before export.")}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{isRtl ? "اللغة" : "Language"}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{getLanguageLabel(document.language)}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{isRtl ? "الثيم الحالي" : "Current theme"}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{theme}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{isRtl ? "الحجم الحالي" : "Current size"}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-100">{pageSize.toUpperCase()}</p>
            </div>
          </div>

          <div className="space-y-3">
            {document.sections.map((section, index) => (
              <div key={`${section.id}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-violet-200">
                      {section.type}
                    </span>
                    {section.level ? (
                      <span className="text-[11px] text-zinc-500">H{section.level}</span>
                    ) : null}
                  </div>
                  <span className="text-[11px] text-zinc-500">{section.direction || (isRtl ? "rtl" : "ltr")}</span>
                </div>
                <p className="text-sm leading-7 text-zinc-200">
                  {section.content || section.items?.join(" • ") || section.rows?.map((row) => row.join(" | ")).join("\n") || "—"}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

