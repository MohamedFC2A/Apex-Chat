// questionnaire-panel.tsx - لوحة الأسئلة التفاعلية الذكية
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";

interface QuestionChoice {
  title: string;
  description: string;
  theme: string;
  config?: Record<string, unknown>;
}

interface Question {
  id: string;
  question: string;
  choices: QuestionChoice[];
}

interface QuestionnairePanelProps {
  questions: Question[];
  onComplete: (selectedChoices: { questionIndex: number; choice: string }[]) => void;
  isRTL?: boolean;
  className?: string;
}

export default function QuestionnairePanel({
  questions,
  onComplete,
  isRTL = true,
  className = "",
}: QuestionnairePanelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;
  const hasSelected = selections[currentIndex] !== undefined;
  const allAnswered = questions.every((_, i) => selections[i] !== undefined);

  const handleSelect = useCallback(
    (value: string) => {
      setSelections(prev => ({ ...prev, [currentIndex]: value }));
    },
    [currentIndex]
  );

  const handleNext = useCallback(() => {
    if (isLastQuestion && allAnswered) {
      setIsSubmitting(true);
      const choices = Object.entries(selections).map(([qIdx, choice]) => ({
        questionIndex: parseInt(qIdx),
        choice,
      }));
      setTimeout(() => onComplete(choices), 400);
    } else if (hasSelected && currentIndex < questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [isLastQuestion, allAnswered, hasSelected, currentIndex, selections, onComplete, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  if (!questions || questions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`rounded-2xl border border-zinc-700/50 bg-zinc-900/90 backdrop-blur-2xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-amber-400" />
        <h3 className="text-lg font-bold text-white">
          {isRTL ? "أسئلة توضيحية" : "Clarifying Questions"}
        </h3>
      </div>

      {/* Progress Bar */}
      <div className="flex gap-1.5 mb-6">
        {questions.map((_, idx) => (
          <motion.div
            key={idx}
            className={`h-1.5 rounded-full flex-1 ${
              idx < currentIndex
                ? "bg-emerald-500"
                : idx === currentIndex
                ? "bg-amber-500"
                : "bg-zinc-700"
            }`}
            animate={idx === currentIndex ? { scaleY: [1, 1.4, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Question Counter */}
      <p className="text-xs text-zinc-500 mb-4 font-mono">
        {isRTL ? "سؤال" : "Question"} {currentIndex + 1} / {questions.length}
      </p>

      {/* Question Text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? -30 : 30 }}
          transition={{ duration: 0.3 }}
        >
          <h4 className="text-base font-medium text-zinc-200 mb-4 leading-relaxed">
            {currentQuestion.question}
          </h4>

          {/* Choices */}
          <div className="space-y-2.5">
            {currentQuestion.choices.map((choice, cIdx) => {
              const isSelected = selections[currentIndex] === choice.theme;
              return (
                <motion.button
                  key={cIdx}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleSelect(choice.theme)}
                  className={`
                    w-full text-left p-3.5 rounded-xl border transition-all duration-200
                    ${isSelected
                      ? "border-amber-500/50 bg-amber-500/10 text-white shadow-lg shadow-amber-500/5"
                      : "border-zinc-700/50 bg-zinc-800/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    }
                  `}
                >
                  <div className="flex items-start gap-3">
                    <span className={`
                      flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center
                      ${isSelected ? "border-amber-500 bg-amber-500" : "border-zinc-600"}
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-zinc-900" />}
                    </span>
                    <div>
                      <span className="text-sm font-medium block">{choice.title}</span>
                      <span className="text-xs text-zinc-500 mt-1 block">{choice.description}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className={`flex items-center ${isRTL ? "justify-start flex-row-reverse" : "justify-end"} gap-2 mt-6`}>
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isRTL ? "السابق" : "Previous"}
          </button>
        )}

        {hasSelected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleNext}
            disabled={isSubmitting}
            className={`
              flex items-center gap-1.5 px-5 py-2 rounded-lg text-sm font-medium transition-all
              ${isLastQuestion && allAnswered
                ? "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:shadow-lg hover:shadow-amber-500/25"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
              }
              disabled:opacity-50
            `}
          >
            {isLastQuestion && allAnswered
              ? (isRTL ? "إرسال الإجابات" : "Submit Answers")
              : (isRTL ? "التالي" : "Next")}
            {!isLastQuestion && (isRTL ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
