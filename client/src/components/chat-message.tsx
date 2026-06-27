import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Search, Sparkles, FileQuestion } from "lucide-react";

interface TypewriterProps {
  text: string;
  speed?: number;
  isDone?: boolean;
}

// The "Pulse" - Thinking Bubble Component
export function ThinkingBubble({ isSearch, isQuiz, isPdf }: { isSearch?: boolean; isQuiz?: boolean; isPdf?: boolean }) {
  const [shouldRender, setShouldRender] = useState(!(isPdf || isQuiz));
  const [step, setStep] = useState(0);

  const pdfSteps = [
    { title: "جاري تحليل هيكل المستند...", subtitle: "استخراج الأقسام والعناوين الرئيسية" },
    { title: "جاري تنظيم المحتوى وتنسيقه...", subtitle: "ترتيب الشيفرات البرمجية والمعادلات الرياضية" },
    { title: "جاري تنسيق المظهر البصري للملف...", subtitle: "تطبيق الهوامش، الخطوط، وتوزيع الصفحات" },
    { title: "جاري إنشاء مستند PDF النهائي...", subtitle: "تصدير الملف وتجهيزه للتحميل المباشر" }
  ];

  const quizSteps = [
    { title: "جاري تحليل المحتوى العلمي...", subtitle: "استخلاص أهم المفاهيم والنقاط الرئيسية" },
    { title: "جاري صياغة الأسئلة الذكية...", subtitle: "توليد أسئلة MSQ متدرجة الصعوبة" },
    { title: "جاري إنشاء الخيارات والإجابات...", subtitle: "تحديد مفاتيح الحل وتنسيق المحتوى" },
    { title: "جاري تجميع الاختبار النهائي...", subtitle: "تجهيز خيارات اللعبة والتحقق من جودة الأسئلة" }
  ];

  const steps = isPdf ? pdfSteps : isQuiz ? quizSteps : [];

  useEffect(() => {
    if (isPdf || isQuiz) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 1500); // 1.5 second delay to make it feel like AI reasoning rather than keyword matching
      return () => clearTimeout(timer);
    }
  }, [isPdf, isQuiz]);

  useEffect(() => {
    if ((isPdf || isQuiz) && shouldRender && steps.length > 0) {
      const interval = setInterval(() => {
        setStep((prev) => (prev + 1) % steps.length);
      }, 2200);
      return () => clearInterval(interval);
    }
  }, [isPdf, isQuiz, shouldRender, steps.length]);

  if (!shouldRender) return null;

  if (isPdf) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, y: 5 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="inline-flex items-center gap-4 bg-zinc-900/60 dark:bg-black/40 border border-zinc-800/80 dark:border-zinc-900/80 rounded-2xl px-5 py-3.5 backdrop-blur-md shadow-md text-foreground font-sans"
        dir="rtl"
      >
        <div className="relative flex items-center justify-center w-8 h-8 bg-violet-500/10 rounded-xl border border-violet-500/20 shrink-0">
          <motion.div
            className="absolute inset-0 rounded-xl border border-dashed border-violet-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          <FileText className="w-4.5 h-4.5 text-violet-400" />
        </div>
        <div className="flex flex-col text-right min-w-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <span className="text-xs font-bold text-zinc-100 font-arabic tracking-wide">
                {steps[step]?.title}
              </span>
              <span className="text-[10px] text-zinc-400 font-arabic mt-0.5">
                {steps[step]?.subtitle}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  if (isQuiz) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9, y: 5 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className="inline-flex items-center gap-4 bg-zinc-900/60 dark:bg-black/40 border border-zinc-800/80 dark:border-zinc-900/80 rounded-2xl px-5 py-3.5 backdrop-blur-md shadow-md text-foreground font-sans"
        dir="rtl"
      >
        <div className="relative flex items-center justify-center w-8 h-8 bg-emerald-500/10 rounded-xl border border-emerald-500/20 shrink-0">
          <motion.div
            className="absolute inset-0 rounded-xl border border-dashed border-emerald-400/40"
            animate={{ rotate: 360 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          />
          <FileQuestion className="w-4.5 h-4.5 text-emerald-400" />
        </div>
        <div className="flex flex-col text-right min-w-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col"
            >
              <span className="text-xs font-bold text-zinc-100 font-arabic tracking-wide">
                {steps[step]?.title}
              </span>
              <span className="text-[10px] text-zinc-400 font-arabic mt-0.5">
                {steps[step]?.subtitle}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  if (isSearch) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="inline-flex items-center gap-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl px-4 py-2.5 backdrop-blur-sm shadow-[0_0_20px_rgba(139,92,246,0.15)] text-violet-300 font-sans"
        dir="rtl"
      >
        <div className="relative flex items-center justify-center w-5 h-5">
          <motion.div
            className="absolute inset-0 rounded-full border border-violet-500/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <Search className="w-3.5 h-3.5 text-violet-400 animate-pulse" />
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold text-zinc-100 font-arabic">جاري البحث في الويب...</span>
          <span className="text-[10px] text-zinc-400 font-arabic">سيرفر Serper.dev يقوم بجمع المعلومات</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="inline-flex items-center gap-1 bg-white/5 rounded-full px-4 py-2 backdrop-blur-sm border border-white/10"
    >
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-zinc-500 rounded-full"
          animate={{
            y: [0, -8, 0],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </motion.div>
  );
}

// The "Flow" - Enhanced Typewriter with Dynamic Speed
export function Typewriter({ text, speed = 5, isDone = false }: TypewriterProps) {
  const [displayed, setDisplayed] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (isDone) {
      setDisplayed(text);
      setCurrentIndex(text.length);
      return;
    }

    if (currentIndex >= text.length) return;

    // Dynamic speed based on punctuation for natural rhythm
    const char = text[currentIndex];
    let delay = speed;
    
    if (char === '.' || char === '!' || char === '?') {
      delay = speed * 8; // Pause after sentences
    } else if (char === ',' || char === ';' || char === ':') {
      delay = speed * 4; // Shorter pause
    } else if (char === '\n') {
      delay = speed * 3; // Line break pause
    }

    const timeout = setTimeout(() => {
      setDisplayed(text.substring(0, currentIndex + 1));
      setCurrentIndex(currentIndex + 1);
    }, delay);

    return () => clearTimeout(timeout);
  }, [text, currentIndex, speed, isDone]);

  const isTyping = !isDone && currentIndex < text.length;

  return (
    <span className="text-sm leading-relaxed whitespace-pre-wrap">
      {displayed}
      {isTyping && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-1.5 h-4 bg-white ml-0.5 rounded-sm"
        >
          ▋
        </motion.span>
      )}
    </span>
  );
}
