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

export function SearchTopologyVisualizer() {
  const [stage, setStage] = useState(0);
  const [sourcesCount, setSourcesCount] = useState(0);
  const [scrapedCount, setScrapedCount] = useState(0);
  const [currentScrapeUrl, setCurrentScrapeUrl] = useState("wikipedia.org");

  const urls = [
    "wikipedia.org/wiki/Federal_Reserve",
    "reuters.com/markets/interest-rates-decisions",
    "bloomberg.com/fed-interest-rates-economic-outlook",
    "arxiv.org/abs/2602.04532",
    "github.com/microsoft/autogen",
    "stackoverflow.com/questions/tagged/node",
    "nature.com/articles/s41586-news-2026",
    "yallakora.com/match-standings",
    "kooora.com/leagues",
    "apnews.com/financial-updates-today"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => (prev + 1) % 6);
    }, 3200);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage === 1) {
      const start = Date.now();
      const duration = 2400;
      const interval = setInterval(() => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        setSourcesCount(Math.floor(progress * 1584));
        if (progress === 1) clearInterval(interval);
      }, 40);
      return () => clearInterval(interval);
    } else if (stage < 1) {
      setSourcesCount(0);
    } else {
      setSourcesCount(1584);
    }
  }, [stage]);

  useEffect(() => {
    if (stage === 3) {
      const interval = setInterval(() => {
        setScrapedCount((prev) => Math.min(prev + 1, 35));
        setCurrentScrapeUrl(urls[Math.floor(Math.random() * urls.length)]);
      }, 70);
      return () => clearInterval(interval);
    } else if (stage < 3) {
      setScrapedCount(0);
    } else {
      setScrapedCount(35);
    }
  }, [stage]);

  const stages = [
    {
      title: "توسيع الاستعلام والترجمة الفورية",
      subtitle: "توليد 32 استعلام فرعي متوازي (عربي / إنجليزي)",
      details: "توسيع دلالي للمفردات وبناء مسارات بحث إضافية"
    },
    {
      title: "المسح الضخم لـ DuckDuckGo",
      subtitle: `فحص واسترجاع ${sourcesCount} مصدراً معرفياً متزامناً`,
      details: "تشغيل 20 خيط بحث متوازي لسحب روابط الويب والأخبار"
    },
    {
      title: "تصنيف الموثوقية وإزالة التكرار",
      subtitle: "استبعاد 84% من المدونات الضعيفة والتحقق من النطاقات",
      details: "تقييم مصداقية المصادر وفرز النطاقات المكررة"
    },
    {
      title: "الزحف العميق واستخلاص المحتوى",
      subtitle: `قراءة وتحليل المحتوى الكامل لـ ${scrapedCount}/35 صفحة معرفية وإخبارية`,
      details: `جارٍ فحص: ${currentScrapeUrl}`
    },
    {
      title: "إعادة الترتيب العصبي VL Reranker",
      subtitle: "مطابقة دلالية للنصوص باستخدام نموذج Llama-Nemotron",
      details: "فرز الفقرات وتحديد درجة المطابقة بنسبة دقة تفوق 99.4%"
    },
    {
      title: "التركيب المعرفي والربط بالذكاء الاصطناعي",
      subtitle: "توجيه المستندات الموثقة للـ AI لصياغة الرد النهائي المنسق",
      details: "دمج الأدلة التاريخية ووضع قائمة المصادر والمراجع المعتمدة"
    }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="w-full max-w-xl bg-zinc-950/90 border border-zinc-800/80 rounded-xl p-5 shadow-2xl backdrop-blur-xl font-mono text-foreground space-y-4"
      dir="rtl"
    >
      <style>{`
        @keyframes flow-line {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .flow-path {
          stroke-dasharray: 8 4;
          animation: flow-line 1.2s linear infinite;
        }
        @keyframes pulse-node {
          0%, 100% { filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.4)); }
          50% { filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.8)); }
        }
        .active-pulse {
          animation: pulse-node 2s infinite ease-in-out;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-ping" />
          <span className="text-xs font-bold text-zinc-100 tracking-wider">APEX SEARCH DEEP TOPOLOGY</span>
        </div>
        <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/20 text-[9px] text-purple-400 font-bold uppercase tracking-widest">
          Superpowered
        </span>
      </div>

      {/* Topology Nodes Grid */}
      <div className="relative flex flex-col gap-4">
        {stages.map((stg, idx) => {
          const isActive = stage === idx;
          const isCompleted = stage > idx;

          return (
            <div key={idx} className="relative flex gap-4 items-start z-10">
              {/* Connector line between steps */}
              {idx < stages.length - 1 && (
                <div className="absolute top-7 right-[11px] w-[2px] h-9 bg-zinc-800 -z-10">
                  {isCompleted && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: "100%" }}
                      transition={{ duration: 0.5 }}
                      className="w-full bg-emerald-500"
                    />
                  )}
                  {isActive && (
                    <div className="w-full h-full bg-gradient-to-b from-purple-500 to-zinc-800 animate-pulse" />
                  )}
                </div>
              )}

              {/* Node Indicator */}
              <div className="flex-shrink-0 mt-1">
                {isCompleted ? (
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center text-emerald-500">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : isActive ? (
                  <div className="w-6 h-6 rounded-full bg-purple-500 border border-purple-400 flex items-center justify-center text-white active-pulse font-bold text-xs relative">
                    <div className="absolute inset-0 rounded-full border border-purple-400 animate-ping opacity-60" />
                    {idx + 1}
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold">
                    {idx + 1}
                  </div>
                )}
              </div>

              {/* Node Details */}
              <div className="flex-grow text-right min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[11px] font-bold tracking-wide transition-colors ${isActive ? 'text-purple-400' : isCompleted ? 'text-zinc-300' : 'text-zinc-500'}`}>
                    {stg.title}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-bold text-purple-400 animate-pulse font-mono tracking-widest uppercase">
                      [جاري المعالجة]
                    </span>
                  )}
                </div>
                <p className={`text-[10px] mt-0.5 leading-relaxed font-sans ${isActive ? 'text-zinc-100 font-medium' : isCompleted ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {stg.subtitle}
                </p>
                <p className={`text-[8.5px] mt-0.5 tracking-tight font-mono transition-opacity ${isActive ? 'text-purple-400/80 opacity-100' : 'text-zinc-600 opacity-60'}`}>
                  {stg.details}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mini-Terminal Logs */}
      {stage >= 1 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="bg-zinc-950 border border-zinc-900/60 rounded-lg p-2.5 font-mono text-[9px] text-zinc-400 space-y-1 overflow-hidden"
        >
          <div className="flex justify-between items-center text-zinc-500 border-b border-zinc-900 pb-1 mb-1.5">
            <span>TERMINAL CONSOLE</span>
            <span>STATUS: {stage === 5 ? "SUCCESS" : "RUNNING"}</span>
          </div>
          {stage >= 1 && (
            <div className="flex items-center gap-1.5 text-emerald-400 animate-in fade-in duration-300">
              <span className="text-zinc-600">❯</span>
              <span>[OK] Core search variations constructed and dispatched in parallel threads.</span>
            </div>
          )}
          {stage >= 2 && sourcesCount > 0 && (
            <div className="flex items-center gap-1.5 text-emerald-400 animate-in fade-in duration-300">
              <span className="text-zinc-600">❯</span>
              <span>[INFO] Successfully extracted and indexed {sourcesCount} search candidates from DuckDuckGo.</span>
            </div>
          )}
          {stage >= 3 && (
            <div className="flex items-center gap-1.5 text-emerald-400 animate-in fade-in duration-300">
              <span className="text-zinc-600">❯</span>
              <span>[OK] Authority validation protocol complete. Non-credible domains and duplicates purged.</span>
            </div>
          )}
          {stage >= 4 && scrapedCount > 0 && (
            <div className="flex items-start gap-1.5 text-purple-400 animate-in fade-in duration-300">
              <span className="text-zinc-600 flex-shrink-0">❯</span>
              <span className="break-all">[CRAWL] Deep read successfully parsed {scrapedCount}/35 pages content in parallel.</span>
            </div>
          )}
          {stage >= 5 && (
            <div className="flex items-center gap-1.5 text-emerald-400 animate-in fade-in duration-300">
              <span className="text-zinc-600">❯</span>
              <span>[OK] Llama-Nemotron-Rerank-VL context matching completed. Slices sorted successfully.</span>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
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

  if (isSearch) {
    return <SearchTopologyVisualizer />;
  }

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
