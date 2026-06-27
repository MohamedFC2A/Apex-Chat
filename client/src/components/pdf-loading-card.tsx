import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  const [progress, setProgress] = useState(10);
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
    const progressTimer = window.setInterval(() => {
      setProgress((value) => (value >= 92 ? value : value + Math.floor(Math.random() * 10) + 2));
    }, 220);

    const stepTimer = window.setInterval(() => {
      setStepIndex((value) => (value + 1) % steps.length);
    }, 1800);

    const factTimer = window.setInterval(() => {
      setFactIndex((value) => (value + 1) % facts.length);
    }, 2600);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(stepTimer);
      window.clearInterval(factTimer);
    };
  }, [facts.length, steps.length]);

  const isRtl = language !== "en";

  return (
    <div
      className="my-4 overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-zinc-950/95 via-zinc-950/80 to-cyan-950/20 p-6 shadow-[0_20px_60px_rgba(6,182,212,0.08)] backdrop-blur-xl"
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="flex flex-col items-center gap-5 text-center">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <motion.div
            className="absolute inset-0 rounded-[28px] border border-cyan-400/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-3 rounded-[22px] border border-dashed border-violet-400/30"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03]">
            <FileText className="h-7 w-7 text-cyan-300" />
            <Sparkles className="absolute -right-1 -top-1 h-4 w-4 text-violet-300" />
          </div>
        </div>

        <div className="space-y-1">
          <h4 className="text-sm font-bold text-zinc-100 font-arabic">
            {isRtl ? "جاري تجهيز مستند PDF احترافي" : "Preparing a professional PDF document"}
          </h4>
          <p className="text-xs text-zinc-400">{steps[stepIndex]}</p>
        </div>

        <div className="w-full max-w-md space-y-2">
          <Progress value={progress} className="h-2 bg-white/5" />
          <div className="flex items-center justify-between text-[11px] text-zinc-500">
            <span>{isRtl ? "المعالجة" : "Processing"}</span>
            <span>{progress}%</span>
          </div>
        </div>

        <div className="min-h-10 max-w-lg border-t border-white/5 pt-4 text-[11.5px] leading-relaxed text-zinc-400">
          <AnimatePresence mode="wait">
            <motion.p
              key={factIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <span className="text-cyan-300">PDF</span> {facts[factIndex]}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

