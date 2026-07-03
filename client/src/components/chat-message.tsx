import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Search, Brain, FileQuestion } from "lucide-react";

interface TypewriterProps {
  text: string;
  speed?: number;
  isDone?: boolean;
}

interface ThinkingBubbleProps {
  isSearch?: boolean;
  isQuiz?: boolean;
  isPdf?: boolean;
  isThink?: boolean;
}

export function ThinkingBubble({ isSearch, isQuiz, isPdf, isThink }: ThinkingBubbleProps) {
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
    { title: "جاري صياغة الأسئلة الذكية...", subtitle: "توليد أسئلة MCQ متدرجة الصعوبة" },
    { title: "جاري إنشاء الخيارات والإجابات...", subtitle: "تحديد مفاتيح الحل وتنسيق المحتوى" },
    { title: "جاري تجميع الاختبار النهائي...", subtitle: "تجهيز خيارات اللعبة والتحقق من جودة الأسئلة" }
  ];

  const searchSteps = [
    { title: "جاري تشغيل محرك البحث...", subtitle: "إرسال الاستعلام إلى Google Serper" },
    { title: "جاري استخراج نتائج البحث...", subtitle: "تحليل المقالات والروابط الأكثر ملاءمة" },
    { title: "جاري فلترة وتصنيف المعلومات...", subtitle: "استخلاص الحقائق والأدلة والتواريخ" },
    { title: "جاري صياغة الإجابة النهائية...", subtitle: "تجميع البيانات والربط بينها وتدعيمها بالمصادر" }
  ];

  const thinkSteps = [
    { title: "جاري تحديد بنية السؤال والأهداف...", subtitle: "تفكيك الاستعلام إلى خطوات منطقية" },
    { title: "جاري اقتراح مسارات الحل والتحقق منها...", subtitle: "تقييم الاستدلالات والافتراضات البديلة" },
    { title: "جاري تدقيق المنطق ورصد الثغرات...", subtitle: "معالجة الحالات الخاصة والتناقضات الممكنة" },
    { title: "جاري بلورة النتيجة والتحقق من صحتها...", subtitle: "تنسيق الشرح خطوة بخطوة للرد النهائي" }
  ];

  const hasSteps = isPdf || isQuiz || isSearch || isThink;
  const steps = isPdf 
    ? pdfSteps 
    : isQuiz 
      ? quizSteps 
      : isSearch 
        ? searchSteps 
        : isThink 
          ? thinkSteps 
          : [];

  useEffect(() => {
    if (isPdf || isQuiz) {
      const timer = setTimeout(() => {
        setShouldRender(true);
      }, 100); 
      return () => clearTimeout(timer);
    }
  }, [isPdf, isQuiz]);

  useEffect(() => {
    if (hasSteps && shouldRender && steps.length > 0) {
      const interval = setInterval(() => {
        setStep((prev) => (prev + 1) % steps.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [hasSteps, shouldRender, steps.length]);

  if (!shouldRender) return null;

  if (hasSteps && steps.length > 0) {
    const IconComponent = isPdf 
      ? FileText 
      : isQuiz 
        ? FileQuestion 
        : isSearch 
          ? Search 
          : Brain;

    return (
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95, y: 5 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="inline-flex items-center gap-4 bg-zinc-950 border border-white/8 rounded-sm px-5 py-3.5 shadow-2xl text-foreground font-mono"
        dir="rtl"
      >
        <div className="relative flex items-center justify-center w-8 h-8 bg-white/5 rounded-sm border border-white/10 shrink-0">
          <motion.div
            className="absolute inset-0 rounded-sm border border-dashed border-white/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          />
          <IconComponent className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col text-right min-w-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
              className="flex flex-col font-mono"
            >
              <span className="text-xs font-bold text-white tracking-wide">
                {steps[step]?.title}
              </span>
              <span className="text-[10px] text-white/40 mt-0.5">
                {steps[step]?.subtitle}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Fallback simple pulsing dots
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
          className="w-2 h-2 bg-white/40 rounded-full"
          animate={{
            y: [0, -6, 0],
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

    const char = text[currentIndex];
    let delay = speed;
    
    if (char === '.' || char === '!' || char === '?') {
      delay = speed * 8;
    } else if (char === ',' || char === ';' || char === ':') {
      delay = speed * 4;
    } else if (char === '\n') {
      delay = speed * 3;
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
