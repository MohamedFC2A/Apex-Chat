import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";

const factsArabic = [
  "ملفات PDF المولدة هنا تبقى نصية وقابلة للبحث والنسخ.",
  "دعم RTL يجعل الفقرات العربية والكود الإنجليزي يعملان معًا داخل نفس المستند.",
  "المعادلات تُرسم بصيغة KaTeX بدل تحويلها إلى صور.",
  "تظليل الكود يتم على السيرفر حتى يظهر بنفس الجودة داخل ملف الـ PDF.",
];

const factsEnglish = [
  "Generated PDFs remain searchable text, not screenshots.",
  "RTL support lets Arabic prose and English code coexist cleanly.",
  "Math blocks are rendered with KaTeX instead of image snapshots.",
  "Code highlighting is prepared server-side for stable PDF output.",
];

interface PDFLoadingCardProps {
  language?: "ar" | "en" | "mixed";
}

export function PDFLoadingCard({ language = "ar" }: PDFLoadingCardProps) {
  const activePdfProgress = useChatStore((state) => state.activePdfProgress);
  const progress = activePdfProgress ? Math.min(99, Math.round((activePdfProgress.current / activePdfProgress.total) * 100)) : 10;
  const [stepIndex, setStepIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);

  const steps =
    language === "ar"
      ? [
          "تحليل هيكل المستند",
          "تنظيم الأقسام والعناوين",
          "تجهيز الكود والمعادلات",
          "بناء تنسيق PDF الاحترافي",
        ]
      : [
          "Analyzing document structure",
          "Organizing sections and headings",
          "Preparing code and math blocks",
          "Building the final PDF layout",
        ];

  const facts = language === "en" ? factsEnglish : factsArabic;

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setStepIndex((value) => (value + 1) % steps.length);
    }, 1800);

    const factTimer = window.setInterval(() => {
      setFactIndex((value) => (value + 1) % facts.length);
    }, 2600);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(factTimer);
    };
  }, [facts.length, steps.length]);

  const isRtl = language !== "en";

  // Pixel blocks configuration
  const totalBlocks = 40;
  const activeBlocks = Math.round((progress / 100) * totalBlocks);

  return (
    <div
      className="my-4 overflow-hidden rounded-xl border border-zinc-800 bg-neutral-950 p-6 shadow-2xl relative bg-[radial-gradient(#e5e7eb03_1px,transparent_1px)] [background-size:16px_16px] font-mono"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        
        {/* Simplified Flat Monospace Spinner Box */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded border border-zinc-800 bg-black">
          <FileText className="h-6 w-6 text-zinc-400" />
          <motion.div
            className="absolute -inset-0.5 rounded border border-dashed border-zinc-700/60 pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="space-y-1.5 font-mono select-none">
          <h4 className="text-xs font-black text-white uppercase tracking-widest">
            {isRtl ? "جاري تجهيز مستند PDF احترافي" : "Preparing a professional PDF document"}
          </h4>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{steps[stepIndex]}</p>
        </div>

        {/* Double-Row Pixel Grid Progress Bar */}
        <div className="w-full max-w-md space-y-3 font-mono select-none">
          <div className="flex gap-[2px] w-full py-1">
            {Array.from({ length: totalBlocks }).map((_, i) => {
              const isActive = i < activeBlocks;
              return (
                <div key={i} className="flex-1 flex flex-col gap-[2px]">
                  <div
                    className={cn(
                      "h-2 transition-all duration-300",
                      isActive ? "bg-white" : "bg-zinc-900"
                    )}
                  />
                  <div
                    className={cn(
                      "h-2 transition-all duration-300",
                      isActive ? "bg-white" : "bg-zinc-900"
                    )}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[9px] text-zinc-500 font-bold uppercase tracking-wider">
            <span>{isRtl ? "المعالجة" : "Processing"}</span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Footer info/fact blocks */}
        <div className="w-full min-h-10 max-w-lg border-t border-zinc-900 pt-4 text-[10px] leading-relaxed text-zinc-400 font-mono">
          <AnimatePresence mode="wait">
            <motion.p
              key={factIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-white font-bold">[PDF INFO]</span> {facts[factIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
