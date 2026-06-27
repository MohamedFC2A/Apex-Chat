import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Search, Sparkles } from "lucide-react";

interface TypewriterProps {
  text: string;
  speed?: number;
  isDone?: boolean;
}

// The "Pulse" - Thinking Bubble Component
export function ThinkingBubble({ isSearch, isQuiz, isPdf }: { isSearch?: boolean; isQuiz?: boolean; isPdf?: boolean }) {
  if (isPdf) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="inline-flex items-center gap-3 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl px-4 py-2.5 backdrop-blur-sm shadow-[0_0_20px_rgba(6,182,212,0.15)] text-cyan-300 font-sans"
        dir="rtl"
      >
        <div className="relative flex items-center justify-center w-5 h-5">
          <motion.div
            className="absolute inset-0 rounded-full border border-cyan-500/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <FileText className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold text-zinc-100 font-arabic">جاري تجهيز هيكل PDF الاحترافي...</span>
          <span className="text-[10px] text-zinc-400 font-arabic">تنظيم الأقسام والعناوين والكود</span>
        </div>
      </motion.div>
    );
  }

  if (isQuiz) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.8 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-2.5 backdrop-blur-sm shadow-[0_0_20px_rgba(16,185,129,0.15)] text-emerald-300 font-sans"
        dir="rtl"
      >
        <div className="relative flex items-center justify-center w-5 h-5">
          <motion.div
            className="absolute inset-0 rounded-full border border-emerald-500/30"
            animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />
          <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        </div>
        <div className="flex flex-col text-right">
          <span className="text-xs font-semibold text-zinc-100 font-arabic">جاري صياغة اختبار MSQ متدرج الصعوبة...</span>
          <span className="text-[10px] text-zinc-400 font-arabic">توليد الأسئلة والخيارات الذكية</span>
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
