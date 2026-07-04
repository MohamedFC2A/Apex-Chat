import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  RefreshCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatStore } from "@/lib/store";

type RawOptionMap = Record<string, string>;

interface QuizQuestion {
  id: string;
  question: string;
  options: RawOptionMap;
  correctAnswer: string;
  explanation: string;
  difficulty?: "easy" | "medium" | "hard" | "impossible";
}

interface QuizPayload {
  title: string;
  description?: string;
  mode?: "practice" | "exam";
  questions: QuizQuestion[];
}

interface NormalizedOption {
  key: string;
  label: string;
}

interface NormalizedQuestion {
  id: string;
  question: string;
  options: NormalizedOption[];
  correctAnswer: string;
  explanation: string;
  difficulty: "easy" | "medium" | "hard" | "impossible";
}

interface NormalizedQuiz {
  title: string;
  description: string;
  mode: "practice" | "exam";
  startingDifficulty: "easy" | "medium" | "hard" | "impossible";
  questions: NormalizedQuestion[];
}

const factsArabic = [
  "أول مبرمج في التاريخ كان امرأة، وهي آدا لوفليس عام 1843!",
  "المصطلح 'Bug' (خطأ برمجي) جاء عندما عثرت العالمة غريس هوبر على فراشة حقيقية داخل حاسوبها عام 1947!",
  "لغة الجافا سكريبت تم تطويرها في 10 أيام فقط بواسطة برندان آيخ عام 1995!",
  "أول لعبة فيديو في التاريخ تم تطويرها عام 1958 وكانت تسمى Physics Tennis!",
  "حوالي 99% من الأكواد البرمجية المكتوبة لزيارة القمر كانت أصغر حجماً من صورة سيلفي اليوم!",
];

const factsEnglish = [
  "Ada Lovelace was the world's first computer programmer in 1843!",
  "The term 'Bug' was coined in 1947 when Grace Hopper found a real moth trapped in a relay!",
  "JavaScript was created in just 10 days by Brendan Eich in 1995!",
  "The first computer game was created in 1958 and was called Physics Tennis!",
  "The code that took Apollo 11 to the moon was smaller than a modern smartphone selfie!"
];

const difficultyLabels: Record<string, { ar: string; en: string; class: string }> = {
  easy: { ar: "سهل", en: "Easy", class: "border-white/10 bg-white text-zinc-950 font-semibold" },
  medium: { ar: "متوسط", en: "Medium", class: "border-white/10 bg-white text-zinc-950 font-semibold" },
  hard: { ar: "صعب", en: "Hard", class: "border-white/10 bg-white text-zinc-950 font-semibold" },
  impossible: { ar: "مستحيل 🔥", en: "Impossible 🔥", class: "border-white/10 bg-white text-zinc-950 font-bold animate-pulse" },
};

function containsArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function normalizeQuiz(rawText: string): NormalizedQuiz {
  const cleaned = rawText
    .replace(/^```mcq-quiz\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const payload = JSON.parse(cleaned) as QuizPayload;

  if (!payload?.title || !Array.isArray(payload.questions) || payload.questions.length === 0) {
    throw new Error("Invalid quiz payload");
  }

  const questions = payload.questions.map((question, index) => {
    const optionsRecord = question.options || {};
    const options = Object.entries(optionsRecord).map(([key, label]) => ({
      key,
      label,
    }));

    if (!question.question || options.length < 2 || !question.correctAnswer) {
      throw new Error(`Invalid question at index ${index}`);
    }

    const rawDiff = String(question.difficulty || "medium").trim().toLowerCase();
    let difficulty: "easy" | "medium" | "hard" | "impossible" = "medium";
    if (rawDiff === "easy" || rawDiff === "سهل") difficulty = "easy";
    else if (rawDiff === "medium" || rawDiff === "متوسط") difficulty = "medium";
    else if (rawDiff === "hard" || rawDiff === "صعب") difficulty = "hard";
    else if (rawDiff === "impossible" || rawDiff === "مستحيل") difficulty = "impossible";

    return {
      id: question.id || `q${index + 1}`,
      question: question.question,
      options,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || "",
      difficulty,
    };
  });

  const rawStartingDiff = String((payload as any).startingDifficulty || "medium").trim().toLowerCase();
  let startingDifficulty: "easy" | "medium" | "hard" | "impossible" = "medium";
  if (rawStartingDiff === "easy" || rawStartingDiff === "سهل") startingDifficulty = "easy";
  else if (rawStartingDiff === "medium" || rawStartingDiff === "متوسط") startingDifficulty = "medium";
  else if (rawStartingDiff === "hard" || rawStartingDiff === "صعب") startingDifficulty = "hard";
  else if (rawStartingDiff === "impossible" || rawStartingDiff === "مستحيل") startingDifficulty = "impossible";

  return {
    title: payload.title,
    description: payload.description || "",
    mode: payload.mode === "exam" ? "exam" : "practice",
    startingDifficulty,
    questions,
  };
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

function QuizOptionCard({
  option,
  selected,
  locked,
  revealed,
  isCorrect,
  onSelect,
}: {
  option: NormalizedOption;
  selected: boolean;
  locked: boolean;
  revealed: boolean;
  isCorrect: boolean;
  onSelect: () => void;
}) {
  const showCorrect = revealed && isCorrect;
  const showWrong = revealed && selected && !isCorrect;

  return (
    <motion.button
      type="button"
      whileHover={locked ? undefined : { y: -1, scale: 1.005 }}
      whileTap={locked ? undefined : { scale: 0.995 }}
      onClick={onSelect}
      disabled={locked}
      className={cn(
        "relative w-full overflow-hidden rounded-xl border px-4 py-4 text-start transition-all duration-200",
        "bg-zinc-950/40 backdrop-blur-md",
        "border-white/5 shadow-sm",
        !locked && "hover:border-white/20 hover:bg-white/[0.02]",
        selected && !revealed && "border-white/30 bg-white/[0.06] shadow-[0_0_15px_rgba(255,255,255,0.02)]",
        showCorrect && "border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]",
        showWrong && "border-rose-500/30 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.05)]",
        locked && "cursor-default"
      )}
    >
      <div className="flex items-center gap-3.5">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs font-bold transition-all duration-200",
            selected && !revealed ? "border-white bg-white text-black" : "border-white/10 bg-black/20 text-zinc-400",
            showCorrect && "border-emerald-400 bg-emerald-500 text-white",
            showWrong && "border-rose-400 bg-rose-500 text-white"
          )}
        >
          {option.key}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className={cn(
              "text-sm font-medium leading-relaxed transition-colors duration-200",
              selected ? "text-white" : "text-zinc-300",
              showCorrect && "text-emerald-200",
              showWrong && "text-rose-200"
            )}>{option.label}</p>
            <span className="shrink-0">
              {showCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : showWrong ? (
                <XCircle className="h-5 w-5 text-rose-400" />
              ) : selected ? (
                <Circle className="h-5 w-5 fill-white text-white" />
              ) : (
                <Circle className="h-5 w-5 text-zinc-700" />
              )}
            </span>
          </div>
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </motion.button>
  );
}

export function MCQQuizLoadingCard() {
  const activeQuizProgress = useChatStore((state) => state.activeQuizProgress);
  const progress = activeQuizProgress ? Math.min(99, Math.round((activeQuizProgress.current / activeQuizProgress.total) * 100)) : 10;
  const [factIndex, setFactIndex] = useState(0);

  useEffect(() => {
    const factInterval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % factsArabic.length);
    }, 3000);

    return () => {
      clearInterval(factInterval);
    };
  }, []);

  return (
    <div
      className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/40 backdrop-blur-xl p-6 shadow-xl flex flex-col items-center gap-6"
      dir="rtl"
    >
      {/* Dynamic Animated Core Visualizer */}
      <div className="relative flex items-center justify-center w-28 h-28">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          className="absolute w-24 h-24 rounded-full border-2 border-dashed border-emerald-500/35 flex items-center justify-center"
        >
          <div className="w-20 h-20 rounded-full border border-emerald-400/20" />
        </motion.div>
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          className="absolute w-18 h-18 rounded-full border border-dotted border-white/10"
        />
        <div className="absolute flex flex-col items-center justify-center">
          <Sparkles className="w-7 h-7 text-emerald-400 animate-pulse" />
          <span className="text-[11px] text-zinc-400 font-mono font-bold mt-1.5">{progress}%</span>
        </div>
      </div>

      <div className="w-full text-center space-y-1.5">
        <h4 className="text-sm font-bold text-zinc-100 font-arabic">صياغة اختبار ذكي متدرج الصعوبة</h4>
        <p className="text-xs text-zinc-500 max-w-xs mx-auto">يتم توزيع الأسئلة الآن: سهل ➔ متوسط ➔ صعب ➔ مستحيل...</p>
      </div>

      {/* GPU Accelerated Scanline Slider */}
      <div className="relative w-full max-w-sm h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
          animate={{ x: `${progress - 100}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Fun Facts Rotator Carousel */}
      <div className="w-full max-w-md h-14 border-t border-white/5 pt-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={factIndex}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-[11.5px] text-zinc-400 text-center leading-relaxed font-arabic"
          >
            💡 <span className="font-semibold text-emerald-400/90">{factsArabic[factIndex]}</span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function MCQQuizWidget({ jsonText, intentVerified }: { jsonText: string; intentVerified?: boolean }) {
  // ── All hooks must be called unconditionally before any early return ──
  const parsedRawJson = useMemo(() => {
    try {
      const cleaned = jsonText
        .replace(/^```mcq-quiz\s*/i, "")
        .replace(/```$/i, "")
        .trim();
      return JSON.parse(cleaned);
    } catch {
      return null;
    }
  }, [jsonText]);

  const parsed = useMemo(() => {
    if (!intentVerified) return { quiz: null, error: null };
    try {
      return { quiz: normalizeQuiz(jsonText), error: null };
    } catch (error) {
      return { quiz: null, error: error instanceof Error ? error.message : "Invalid quiz payload" };
    }
  }, [jsonText, intentVerified]);

  const quiz = parsed.quiz;

  const isRtl = useMemo(() => {
    if (!quiz) return true;
    return containsArabic(`${quiz.title} ${quiz.description} ${quiz.questions.map((item) => item.question).join(" ")}`);
  }, [quiz]);

  // Adaptive test session setup
  const maxSessionQuestions = useMemo(() => {
    return quiz ? Math.min(5, quiz.questions.length) : 0;
  }, [quiz]);

  const [sessionQuestionIds, setSessionQuestionIds] = useState<string[]>(() => {
    if (!quiz || quiz.questions.length === 0) return [];
    const startQuestion = quiz.questions.find((q) => q.difficulty === quiz.startingDifficulty);
    if (startQuestion) return [startQuestion.id];
    const mediumQuestion = quiz.questions.find((q) => q.difficulty === "medium");
    if (mediumQuestion) return [mediumQuestion.id];
    return [quiz.questions[0].id];
  });

  const [currentDifficulty, setCurrentDifficulty] = useState<"easy" | "medium" | "hard" | "impossible">(() => {
    if (!quiz || quiz.questions.length === 0) return "medium";
    const startQuestion = quiz.questions.find((q) => q.difficulty === quiz.startingDifficulty);
    if (startQuestion) return quiz.startingDifficulty;
    const mediumQuestion = quiz.questions.find((q) => q.difficulty === "medium");
    if (mediumQuestion) return "medium";
    return quiz.questions[0].difficulty;
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);

  const sessionQuestions = useMemo(() => {
    if (!quiz) return [] as NormalizedQuestion[];
    return sessionQuestionIds.map(id => quiz.questions.find(q => q.id === id)).filter(Boolean) as NormalizedQuestion[];
  }, [sessionQuestionIds, quiz]);

  const setActiveQuizProgress = useChatStore((state) => state.setActiveQuizProgress);

  useEffect(() => {
    if (!quiz) return;
    if (showResults) {
      setActiveQuizProgress({ current: maxSessionQuestions, total: maxSessionQuestions });
    } else {
      const selectedAnswer = sessionQuestions[currentIndex] ? answers[sessionQuestions[currentIndex].id] : undefined;
      setActiveQuizProgress({
        current: currentIndex + (selectedAnswer ? 1 : 0),
        total: maxSessionQuestions,
      });
    }
  }, [currentIndex, answers, showResults, maxSessionQuestions, setActiveQuizProgress, quiz, sessionQuestions]);

  // ── Early return guards (after ALL hooks are declared) ──
  if (!intentVerified) {
    console.warn("Security Safeguard: MCQ block blocked from rendering without user confirmation.");
    const fallbackText = parsedRawJson?.explanation || parsedRawJson?.description || parsedRawJson?.title || "Quiz Content (Intent not verified)";
    return <p className="text-sm text-neutral-400 font-arabic" dir="auto">{fallbackText}</p>;
  }

  if (!quiz) {
    return (
      <div className="my-4 rounded-xl border border-rose-400/20 bg-rose-400/10 p-4 text-right font-arabic" dir="rtl">
        <p className="text-sm font-semibold text-rose-200">تعذر عرض الاختبار التفاعلي.</p>
        <p className="mt-1 text-sm text-zinc-300">صيغة `mcq-quiz` غير صالحة أو غير مكتملة.</p>
        {parsed.error && <pre className="mt-3 overflow-x-auto rounded-xl bg-black/20 p-3 text-left text-xs text-rose-100">{parsed.error}</pre>}
      </div>
    );
  }

  const question = sessionQuestions[currentIndex] || quiz.questions[0];
  const selectedAnswer = answers[question.id];
  const isRevealed = !!revealed[question.id];
  const answeredCount = Object.keys(answers).length;
  const score = sessionQuestions.reduce((sum, item) => sum + (answers[item.id] === item.correctAnswer ? 1 : 0), 0);
  const percent = sessionQuestions.length ? (score / sessionQuestions.length) * 100 : 0;
  const progressValue = showResults ? 100 : ((currentIndex + (selectedAnswer ? 1 : 0)) / maxSessionQuestions) * 100;

  const results = sessionQuestions.map((item) => ({
    id: item.id,
    question: item.question,
    answer: answers[item.id],
    correct: answers[item.id] === item.correctAnswer,
    correctAnswer: item.correctAnswer,
    explanation: item.explanation,
    correctLabel: item.options.find((option) => option.key === item.correctAnswer)?.label || item.correctAnswer,
  }));

  const resetQuiz = () => {
    const startQuestion = quiz.questions.find((q) => q.difficulty === quiz.startingDifficulty);
    const initialId = startQuestion ? startQuestion.id : (quiz.questions.find((q) => q.difficulty === "medium")?.id || quiz.questions[0].id);
    const initialDiff = startQuestion ? quiz.startingDifficulty : (quiz.questions.find((q) => q.difficulty === "medium")?.difficulty || quiz.questions[0].difficulty);

    setSessionQuestionIds([initialId]);
    setCurrentDifficulty(initialDiff);
    setCurrentIndex(0);
    setAnswers({});
    setRevealed({});
    setShowResults(false);
    setReviewMode(false);
  };

  const selectAnswer = (optionKey: string) => {
    if (showResults) return;
    if (revealed[question.id]) return;

    setAnswers((prev) => ({ ...prev, [question.id]: optionKey }));
    setRevealed((prev) => ({ ...prev, [question.id]: true }));
  };

  const advance = () => {
    if (currentIndex === maxSessionQuestions - 1) {
      setShowResults(true);
      return;
    }

    const isCorrect = answers[question.id] === question.correctAnswer;
    
    // Calculate new difficulty dynamically
    let nextDiff = currentDifficulty;
    if (isCorrect) {
      if (currentDifficulty === "easy") nextDiff = "medium";
      else if (currentDifficulty === "medium") nextDiff = "hard";
      else if (currentDifficulty === "hard") nextDiff = "impossible";
    } else {
      if (currentDifficulty === "impossible") nextDiff = "hard";
      else if (currentDifficulty === "hard") nextDiff = "medium";
      else if (currentDifficulty === "medium") nextDiff = "easy";
    }

    // Filter available remaining questions
    const remainingQuestions = quiz.questions.filter(
      (q) => !sessionQuestionIds.includes(q.id)
    );

    if (remainingQuestions.length === 0) {
      setShowResults(true);
      return;
    }

    // Try to find a question with the target difficulty
    let nextQuestion = remainingQuestions.find((q) => q.difficulty === nextDiff);

    // Fallback order if target difficulty not found
    if (!nextQuestion) {
      const difficultyFallbacks: Record<string, ("easy" | "medium" | "hard" | "impossible")[]> = {
        easy: ["medium", "hard", "impossible"],
        medium: ["hard", "easy", "impossible"],
        hard: ["impossible", "medium", "easy"],
        impossible: ["hard", "medium", "easy"],
      };

      const order = difficultyFallbacks[nextDiff];
      for (const diff of order) {
        nextQuestion = remainingQuestions.find((q) => q.difficulty === diff);
        if (nextQuestion) {
          nextDiff = diff;
          break;
        }
      }
    }

    if (!nextQuestion) {
      nextQuestion = remainingQuestions[0];
      nextDiff = nextQuestion.difficulty;
    }

    setSessionQuestionIds((prev) => [...prev, nextQuestion!.id]);
    setCurrentDifficulty(nextDiff);
    setCurrentIndex((value) => value + 1);
  };

  const hasAnsweredCurrent = typeof selectedAnswer === "string";
  const currentIsCorrect = selectedAnswer === question.correctAnswer;

  if (reviewMode) {
    return (
      <div className="w-full my-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className={cn("space-y-1", isRtl ? "text-right font-arabic" : "text-left")}>
            <h3 className="text-lg font-bold text-zinc-50">مراجعة الأسئلة</h3>
            <p className="text-sm text-zinc-400">{isRtl ? "يمكنك مراجعة الإجابات الصحيحة والتفسيرات لكل سؤال." : "Review correct answers and detailed explanations."}</p>
          </div>
          <Button variant="ghost" onClick={() => setReviewMode(false)} className="rounded-xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 transition-all duration-200">
            {isRtl ? "العودة للنتيجة" : "Back to Results"}
          </Button>
        </div>

        <div className="space-y-4">
          {results.map((item, index) => (
            <div key={item.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-md">
              <div className={cn("mb-3 flex items-start justify-between gap-3", isRtl ? "text-right" : "text-left")}>
                <div>
                  <p className="mb-1 text-xs font-semibold text-zinc-500">{isRtl ? `السؤال ${index + 1}` : `Question ${index + 1}`}</p>
                  <p className="text-sm font-semibold leading-7 text-zinc-100">{item.question}</p>
                </div>
                {item.correct ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-rose-400" />
                )}
              </div>
              <p className="text-sm text-zinc-300">
                {isRtl ? "الإجابة الصحيحة:" : "Correct Answer:"} <span className="font-semibold text-emerald-400">{item.correctAnswer.toUpperCase()} - {item.correctLabel}</span>
              </p>
              {!item.correct && item.answer && (
                <p className="mt-1 text-sm text-rose-400">{isRtl ? "إجابتك:" : "Your Answer:"} {item.answer.toUpperCase()}</p>
              )}
              {item.explanation && <p className="mt-3 text-sm leading-7 text-zinc-400">{item.explanation}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showResults) {
    return (
      <div className="w-full my-4 space-y-5" dir={isRtl ? "rtl" : "ltr"}>
        <div className={cn("mb-5 flex flex-wrap items-start justify-between gap-4", isRtl ? "text-right font-arabic" : "text-left")}>
          <div>
            <h3 className="text-2xl font-bold text-zinc-55">{quiz.title}</h3>
            {quiz.description && <p className="mt-1 text-sm text-zinc-400">{quiz.description}</p>}
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 shadow-sm backdrop-blur-md">
            <Trophy className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-zinc-100"><span dir="ltr">{score} / {sessionQuestions.length}</span></p>
              <p className="text-xs text-zinc-400">{isRtl ? "إجابات صحيحة" : "Correct answers"}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-[200px,1fr]">
          <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-white/5 bg-white/[0.01] backdrop-blur-md">
            <div
              className="relative flex h-36 w-36 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(#10b981 0deg ${percent * 3.6}deg, rgba(255,255,255,0.04) ${percent * 3.6}deg 360deg)`,
              }}
            >
              <div className="flex h-26 w-26 flex-col items-center justify-center rounded-full border border-white/5 bg-zinc-950/90">
                <span className="text-2xl font-bold text-zinc-50">{formatPercent(percent)}</span>
                <span className="mt-0.5 text-[10px] uppercase tracking-[0.24em] text-zinc-500">Score</span>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-emerald-200">
              <p className="text-xs uppercase tracking-[0.24em] text-emerald-400">Correct</p>
              <p className="mt-2 text-3xl font-bold text-emerald-300">{score}</p>
              <p className="mt-1 text-sm text-zinc-400">{isRtl ? "أسئلة تم حلها بشكل صحيح." : "Questions answered correctly."}</p>
            </div>
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 text-rose-200">
              <p className="text-xs uppercase tracking-[0.24em] text-rose-400">Incorrect</p>
              <p className="mt-2 text-3xl font-bold text-rose-300">{sessionQuestions.length - score}</p>
              <p className="mt-1 text-sm text-zinc-400">{isRtl ? "أسئلة تحتاج مراجعة إضافية." : "Questions needing review."}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => resetQuiz()} className="rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold shadow-sm transition-all duration-200">
            <RefreshCcw className="me-2 h-4 w-4" />
            {isRtl ? "إعادة الاختبار" : "Reset Quiz"}
          </Button>
          <Button variant="ghost" onClick={() => setReviewMode(true)} className="rounded-xl border border-white/10 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 transition-all duration-200">
            {isRtl ? "مراجعة الأسئلة" : "Review Questions"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full my-4 space-y-4" dir={isRtl ? "rtl" : "ltr"}>
      <div className={cn("mb-3 flex flex-wrap items-center justify-between gap-4", isRtl ? "text-right font-arabic" : "text-left")}>
        <div>
          <h3 className="text-xl font-bold text-zinc-50">{quiz.title}</h3>
          {quiz.description && <p className="mt-1 text-sm text-zinc-400">{quiz.description}</p>}
        </div>
      </div>

      <div className="flex items-center justify-between text-[11px] font-semibold">
        <span className="text-zinc-500">
          {isRtl ? `السؤال ${currentIndex + 1} من ${maxSessionQuestions}` : `Question ${currentIndex + 1} of ${maxSessionQuestions}`}
        </span>
        <span className={cn("px-2 py-0.5 rounded-full border text-[9px] uppercase tracking-wider", difficultyLabels[question.difficulty]?.class || difficultyLabels.medium.class)}>
          {isRtl ? difficultyLabels[question.difficulty]?.ar : difficultyLabels[question.difficulty]?.en}
        </span>
      </div>

      <motion.div
        key={question.id}
        initial={{ opacity: 0, x: isRtl ? -12 : 12 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="rounded-xl border border-white/5 bg-white/[0.02] p-4 sm:p-5 backdrop-blur-md"
      >
        <div className={cn("mb-4 flex items-start justify-between gap-4", isRtl ? "text-right" : "text-left")}>
          <h4 className="text-lg font-semibold leading-8 text-zinc-55">{question.question}</h4>
          <HelpCircle className="mt-1 h-5 w-5 shrink-0 text-zinc-400" />
        </div>

        <div className="space-y-3">
          {question.options.map((option) => (
            <QuizOptionCard
              key={option.key}
              option={option}
              selected={selectedAnswer === option.key}
              locked={revealed[question.id]}
              revealed={isRevealed}
              isCorrect={option.key === question.correctAnswer}
              onSelect={() => selectAnswer(option.key)}
            />
          ))}
        </div>

        {revealed[question.id] && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "mt-4 rounded-xl border p-4 backdrop-blur-md",
              currentIsCorrect ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-200" : "border-rose-500/20 bg-rose-500/5 text-rose-200"
            )}
          >
            <div className="mb-2 flex items-center gap-2">
              {currentIsCorrect ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : (
                <XCircle className="h-5 w-5 text-rose-400" />
              )}
              <span className="text-sm font-semibold text-zinc-100">
                {currentIsCorrect ? (isRtl ? "إجابة صحيحة" : "Correct answer") : (isRtl ? `الإجابة الصحيحة هي ${question.correctAnswer.toUpperCase()}` : `Correct answer is ${question.correctAnswer.toUpperCase()}`)}
              </span>
            </div>
            {question.explanation && <p className="text-sm leading-7 text-zinc-300">{question.explanation}</p>}
          </motion.div>
        )}
      </motion.div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="text-sm text-zinc-500">
          {hasAnsweredCurrent
            ? (isRtl ? "يمكنك الانتقال للسؤال التالي." : "You can proceed to the next question.")
            : (isRtl ? "اختر إجابة لرؤية التغذية الراجعة." : "Select an answer to see feedback.")}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={advance}
            disabled={!revealed[question.id]}
            className="rounded-xl bg-white text-black hover:bg-zinc-200 font-semibold shadow-sm transition-all duration-200 disabled:opacity-50"
          >
            {currentIndex === maxSessionQuestions - 1
              ? (isRtl ? "عرض النتيجة" : "View Results")
              : (isRtl ? "السؤال التالي" : "Next Question")}
          </Button>
        </div>
      </div>
    </div>
  );
}
