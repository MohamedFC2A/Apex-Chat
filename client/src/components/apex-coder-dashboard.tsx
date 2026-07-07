/**
 * ApexCoderDashboard — مكون موحد لواجهة Apex Coder
 *
 * يستبدل 6 مكونات منفصلة (UnboundStatusCard, WorkTreePanel,
 * UnboundWebGenStatusCard, UnboundPlanCard, UnboundConsole,
 * QuestionnairePanel) بلوحة تحكم واحدة ذكية بتصميم tabbed موحد.
 *
 * المميزات:
 * - تبديل تلقائي للتبويب النشط حسب حالة النظام
 * - عرض جمالي لـ Phase 2 Requirements Confirmation
 * - RTL كامل
 * - قابل للطي بعد الانتهاء
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  Circle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Terminal,
  GitBranch,
  ClipboardList,
  Layers,
  Check,
  Clock,
  Brain,
  Code2,
  Palette,
  Zap,
  Hammer,
  Target,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Minimize2,
  Maximize2,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { UnboundState, UnboundPhase } from "@/lib/unbound-service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkTreeNode {
  id: string;
  label: string;
  labelAr?: string;
  type: string;
  status: "pending" | "running" | "done" | "error" | "skipped";
  children: WorkTreeNode[];
  expanded?: boolean;
  metadata?: Record<string, unknown>;
}

interface WorkTreeEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  type: string;
}

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

// ─── Sub-tasks per phase (bilingual) ─────────────────────────────────────────

const PHASE_SUBTASKS: Record<number, Array<{ id: string; labelAr: string; labelEn: string }>> = {
  1: [
    { id: "p1-1", labelAr: "تحليل متطلبات المستخدم بدقة", labelEn: "Analyze user request requirements" },
    { id: "p1-2", labelAr: "صياغة وثيقة المواصفات الرسمية", labelEn: "Prepare the formal specification brief" },
    { id: "p1-3", labelAr: "اعتماد هيكل الصفحات وعقد الواجهة", labelEn: "Approve page structure and UI contract" },
  ],
  2: [
    { id: "p2-1", labelAr: "إعداد موجز خيارات التهيئة", labelEn: "Prepare the configuration brief" },
    { id: "p2-2", labelAr: "تنظيم البدائل حسب النطاق والوظيفة", labelEn: "Organize options by scope and function" },
    { id: "p2-3", labelAr: "بانتظار اعتماد المتطلبات", labelEn: "Awaiting requirements approval" },
  ],
  3: [
    { id: "p3-1", labelAr: "إنشاء هيكل الصفحة HTML5", labelEn: "Generate HTML5 Semantic DOM" },
    { id: "p3-2", labelAr: "إعداد تقسيمات الصفحة والشبكات", labelEn: "Set up layout grids & flexboxes" },
    { id: "p3-3", labelAr: "إدخال وسوم التسهيل ARIA", labelEn: "Inject accessibility tags (ARIA)" },
    { id: "p3-4", labelAr: "تضمين الأيقونات والشعارات SVG", labelEn: "Embed SVG icons and logos" },
  ],
  4: [
    { id: "p4-1", labelAr: "تحليل شجرة DOM المتولدة", labelEn: "Parse generated DOM tree" },
    { id: "p4-2", labelAr: "استخراج معرّفات المكونات التفاعلية", labelEn: "Extract interactive component IDs" },
    { id: "p4-3", labelAr: "مطابقة فئات CSS ومحددات JS", labelEn: "Sync CSS classes & JS selectors" },
  ],
  5: [
    { id: "p5-1", labelAr: "تجميع طبقة التنسيق المتجاوبة", labelEn: "Compile the responsive presentation layer" },
    { id: "p5-2", labelAr: "برمجة طبقة التفاعل والتنقل", labelEn: "Build the interaction and routing layer" },
    { id: "p5-3", labelAr: "مواءمة الحالات المرئية مع عقد الواجهة", labelEn: "Align visual states with the UI contract" },
    { id: "p5-4", labelAr: "التحقق من استجابة الأحداث", labelEn: "Validate event handlers" },
  ],
  6: [
    { id: "p6-1", labelAr: "فحص تطابق HTML و CSS و JS", labelEn: "Audit HTML/CSS/JS selector alignment" },
    { id: "p6-2", labelAr: "تصحيح محرك التنقل وحالات الواجهة", labelEn: "Correct router and UI state contract usage" },
    { id: "p6-3", labelAr: "منع أخطاء null و undefined", labelEn: "Prevent null and undefined runtime errors" },
  ],
  7: [
    { id: "p7-1", labelAr: "دمج كتل الكود في ملف واحد", labelEn: "Bundle HTML, CSS, and JS assets" },
    { id: "p7-2", labelAr: "إعداد وسوم الشاشة والـ Meta", labelEn: "Set viewport and meta tags" },
    { id: "p7-3", labelAr: "تضمين الخطوط وحزم CDN", labelEn: "Inject custom fonts & CDN packages" },
    { id: "p7-4", labelAr: "فحص جاهزية العرض والمعاينة", labelEn: "Verify preview performance & rendering" },
  ],
};

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "phases" | "plan" | "worktree" | "console";

// ─── Phase Row (compact, inside unified card) ─────────────────────────────────

function PhaseRow({
  phase,
  index,
  isArabic,
}: {
  phase: UnboundPhase;
  index: number;
  isArabic: boolean;
}) {
  const isRunning = phase.status === "running";
  const isDone = phase.status === "done";
  const isError = phase.status === "error";
  const isPending = phase.status === "pending";

  const subtasks = PHASE_SUBTASKS[phase.phase] || [];
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      setActiveSubIndex(isDone ? subtasks.length : 0);
      return;
    }
    setActiveSubIndex(0);
    const interval = setInterval(() => {
      setActiveSubIndex((prev) =>
        prev < subtasks.length - 1 ? prev + 1 : prev,
      );
    }, 2200);
    return () => clearInterval(interval);
  }, [isRunning, isDone, subtasks.length]);

  const getSubtaskStatus = (subIdx: number) => {
    if (isDone) return "done";
    if (isPending) return "pending";
    if (isError) {
      if (subIdx < activeSubIndex) return "done";
      if (subIdx === activeSubIndex) return "error";
      return "pending";
    }
    if (subIdx < activeSubIndex) return "done";
    if (subIdx === activeSubIndex) return "running";
    return "pending";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      className={cn(
        "flex flex-col p-2.5 rounded border mb-1.5 font-mono transition-all",
        isRunning
          ? "border-amber-500/40 bg-amber-950/10"
          : isDone
            ? "border-emerald-500/15 bg-emerald-950/5"
            : isError
              ? "border-red-500/30 bg-red-950/10"
              : "border-zinc-900 bg-zinc-950/20 opacity-40",
      )}
    >
      <div
        onClick={() => !isPending && setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center justify-between gap-2",
          isPending ? "cursor-default" : "cursor-pointer",
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Status icon */}
          <span className="shrink-0">
            {isDone ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            ) : isRunning ? (
              <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
            ) : isError ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-500" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-zinc-700" />
            )}
          </span>

          {/* Phase ID */}
          <span
            className={cn(
              "text-[10px] font-bold font-mono tracking-wider shrink-0",
              isRunning
                ? "text-amber-400"
                : isDone
                  ? "text-emerald-400"
                  : isError
                    ? "text-red-400"
                    : "text-zinc-600",
            )}
          >
            [{String(phase.phase).padStart(2, "0")}]
          </span>

          {/* Phase Name */}
          <span
            className={cn(
              "text-[10.5px] font-bold uppercase tracking-wider font-mono truncate",
              isRunning
                ? "text-white"
                : isDone
                  ? "text-zinc-300"
                  : isError
                    ? "text-red-300"
                    : "text-zinc-600",
            )}
          >
            {phase.name}
          </span>

          {/* Tags */}
          {isRunning && (
            <span className="shrink-0 text-[7px] px-1.5 py-0.5 border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold uppercase tracking-widest animate-pulse">
              LIVE
            </span>
          )}
          {isDone && phase.durationMs && (
            <span className="shrink-0 text-[7px] px-1.5 py-0.5 border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono">
              {(phase.durationMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Expand trigger */}
        {!isPending && (
          <span className="text-zinc-600 hover:text-zinc-400 transition-colors text-[8px] font-bold uppercase select-none shrink-0">
            {isExpanded ? "[ HIDE ]" : "[ LOGS ]"}
          </span>
        )}
      </div>

      {/* Subtasks */}
      <AnimatePresence>
        {isExpanded && (isRunning || isDone || isError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            dir={isArabic ? "rtl" : "ltr"}
            className={cn(
              "mt-2.5 pt-2 border-t border-dashed border-zinc-800/60 flex flex-col gap-1.5 font-mono text-[9px] text-zinc-400",
              isArabic ? "text-right pr-1" : "text-left pl-1",
            )}
          >
            {subtasks.map((sub, subIdx) => {
              const subStatus = getSubtaskStatus(subIdx);
              return (
                <div
                  key={sub.id}
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    subStatus === "pending" ? "opacity-30" : "opacity-100",
                  )}
                >
                  <span
                    className={cn(
                      "font-bold select-none shrink-0 text-[8px]",
                      subStatus === "done"
                        ? "text-emerald-400"
                        : subStatus === "running"
                          ? "text-amber-400"
                          : subStatus === "error"
                            ? "text-red-400"
                            : "text-zinc-600",
                    )}
                  >
                    {subStatus === "done"
                      ? "[OK]"
                      : subStatus === "running"
                        ? "[>]"
                        : subStatus === "error"
                          ? "[!]"
                          : "[.]"}
                  </span>
                  <span className="font-semibold tracking-wide font-mono">
                    {isArabic ? sub.labelAr : sub.labelEn}
                  </span>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Web Gen Step (compact, inside unified card) ──────────────────────────────

const WEB_GEN_STEPS = [
  { key: "architect", label: "Lead Architect", labelAr: "المهندس المعماري", marker: "[🤖 Lead Architect:", icon: Brain },
  { key: "html", label: "HTML Specialist", labelAr: "متخصص HTML", marker: "[🤖 HTML Specialist:", icon: Code2 },
  { key: "css", label: "CSS Specialist", labelAr: "متخصص CSS", marker: "[🤖 CSS Specialist:", icon: Palette },
  { key: "javascript", label: "JS Specialist", labelAr: "متخصص JS", marker: "[🤖 JavaScript Specialist:", icon: Zap },
  { key: "integrator", label: "QA Auditor", labelAr: "مدقق الجودة", marker: "[🤖 Integration Auditor:", icon: Hammer },
];

// ─── Log parser (from UnboundConsole) ────────────────────────────────────────

type LogEntry = { type: string; text: string };

function parseLogs(content: string): LogEntry[] {
  const logs: LogEntry[] = [];
  const lines = content.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("[Phase") || line.startsWith("**[Phase")) {
      const cleanText = line.replace(/\*\*/g, "").trim();
      logs.push({ type: "phase", text: cleanText });
      continue;
    }
    if (line.startsWith("[🔍") || line.startsWith("Searching:") || line.startsWith("**Searching:")) {
      const cleanText = line.replace(/\*\*/g, "").replace(/^\[🔍[^\]]*\]\s*/, "").trim();
      logs.push({ type: "search", text: `🔍 ${cleanText}` });
      continue;
    }
    if (line.startsWith("[🖼️") || line.startsWith("Generating image:") || line.startsWith("[🎨")) {
      const cleanText = line.replace(/\*\*/g, "").replace(/^\[[^\]]*\]\s*/, "").trim();
      logs.push({ type: "image", text: `🖼️ ${cleanText}` });
      continue;
    }
    if (line.startsWith("[⚠️") || line.startsWith("⚠️") || line.startsWith("Warning:")) {
      const cleanText = line.replace(/\*\*/g, "").trim();
      logs.push({ type: "warning", text: cleanText });
      continue;
    }
    if (line.startsWith("[❌") || line.startsWith("Error:") || line.startsWith("[Error")) {
      const cleanText = line.replace(/\*\*/g, "").trim();
      logs.push({ type: "error", text: cleanText });
      continue;
    }
    if (
      line.startsWith("[🤖") ||
      line.startsWith("Architect:") ||
      line.startsWith("HTML Specialist:") ||
      line.startsWith("CSS Specialist:") ||
      line.startsWith("JavaScript Specialist:") ||
      line.startsWith("Integration Auditor:")
    ) {
      const cleanText = line.replace(/\*\*/g, "").trim();
      logs.push({ type: "info", text: cleanText });
      continue;
    }
    if (
      line.startsWith("✓") ||
      line.startsWith("**Release bundle") ||
      line.startsWith("Release bundle") ||
      line.startsWith("**Quality review") ||
      line.startsWith("Quality review") ||
      line.startsWith("**Spec generated") ||
      line.startsWith("**Specification approved") ||
      line.startsWith("Resuming with selected") ||
      line.startsWith("Confirmed configuration")
    ) {
      const cleanText = line.replace(/\*\*/g, "").trim();
      logs.push({ type: "success", text: `✓ ${cleanText}` });
      continue;
    }
  }
  return logs;
}

// ─── Plan parser (from UnboundPlanCard) ──────────────────────────────────────

interface PlanSection {
  title: string;
  items: { text: string; completed: boolean }[];
}

function cleanStatusMarkers(text: string): string {
  return text
    .replace(/\[\s*[✓✗●○]\s*\]/g, "")
    .replace(/^\s*[-*]\s*\[[ xX]\]\s*/gm, "")
    .replace(/\[\s*Phase\s+\d+\/\d+\s*\]/gi, "")
    .replace(/^\s*\[🤖[^\]]*\].*$/gm, "")
    .replace(/^\s*\[(?:RUNNING|DONE|ERROR|PENDING)\]\s*/gim, "")
    .trim();
}

function parsePlanContent(planText: string, content: string): PlanSection[] {
  const sections: PlanSection[] = [];
  const lines = planText.split("\n");
  let currentSection: PlanSection | null = null;

  const isCompleted = (itemText: string): boolean => {
    const escapedText = itemText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const completionPatterns = [
      new RegExp(`\\[\\s*[✓✗x]\\s*\\].*${escapedText}`, "i"),
      new RegExp(`${escapedText}.*completed`, "i"),
      new RegExp(`${escapedText}.*done`, "i"),
    ];
    return completionPatterns.some((p) => p.test(content));
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#") || line.startsWith("===")) {
      const title = line.replace(/^#+\s*/, "").replace(/={3,}/g, "").trim();
      if (title) {
        currentSection = { title: cleanStatusMarkers(title), items: [] };
        sections.push(currentSection);
      }
      continue;
    }

    const isListItem = /^[-*+]\s/.test(line) || /^\d+\.\s/.test(line);
    if (isListItem) {
      const text = line.replace(/^[-*+]\s+/, "").replace(/^\d+\.\s+/, "").trim();
      const cleanText = cleanStatusMarkers(text);
      if (cleanText) {
        if (!currentSection) {
          currentSection = { title: "Tasks", items: [] };
          sections.push(currentSection);
        }
        currentSection.items.push({ text: cleanText, completed: isCompleted(cleanText) });
      }
    }
  }

  return sections.filter((s) => s.items.length > 0);
}

// ─── Work Tree Node (compact) ─────────────────────────────────────────────────

function WorkTreeNodeView({
  node,
  depth = 0,
}: {
  node: WorkTreeNode;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(node.expanded !== false);
  const hasChildren = node.children && node.children.length > 0;

  const statusColor = {
    pending: "text-zinc-500",
    running: "text-amber-400",
    done: "text-emerald-400",
    error: "text-red-400",
    skipped: "text-zinc-600",
  }[node.status] || "text-zinc-500";

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2, delay: depth * 0.03 }}
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded cursor-pointer hover:bg-zinc-900/50 transition-all duration-150",
        )}
        style={{ paddingRight: depth * 14 }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <span className="w-3.5 shrink-0 flex items-center justify-center">
          {hasChildren &&
            (expanded ? (
              <ChevronDown className="w-3 h-3 text-zinc-600" />
            ) : (
              <ChevronRight className="w-3 h-3 text-zinc-600" />
            ))}
        </span>
        <span className="shrink-0">
          {node.status === "done" ? (
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          ) : node.status === "running" ? (
            <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
          ) : node.status === "error" ? (
            <AlertCircle className="w-3.5 h-3.5 text-red-500" />
          ) : (
            <Circle className="w-3.5 h-3.5 text-zinc-700" />
          )}
        </span>
        <span className={cn("text-[11px] font-medium truncate", statusColor)}>
          {node.labelAr || node.label}
        </span>
        {node.status === "running" && (
          <motion.span
            className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {node.children.map((child) => (
              <WorkTreeNodeView key={child.id} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Questionnaire (inline, compact) ─────────────────────────────────────────

function InlineQuestionnaire({
  questions,
  onComplete,
}: {
  questions: Question[];
  onComplete: (choices: { questionIndex: number; choice: string }[]) => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selections, setSelections] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex >= questions.length - 1;
  const hasSelected = selections[currentIndex] !== undefined;
  const allAnswered = questions.every((_, i) => selections[i] !== undefined);

  const handleSelect = useCallback(
    (value: string) => {
      setSelections((prev) => ({ ...prev, [currentIndex]: value }));
    },
    [currentIndex],
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
      setCurrentIndex((prev) => prev + 1);
    }
  }, [isLastQuestion, allAnswered, hasSelected, currentIndex, selections, onComplete, questions.length]);

  if (!questions || questions.length === 0) return null;

  return (
    <div className="font-sans" dir="rtl">
      {/* Progress dots */}
      <div className="flex gap-1.5 mb-4">
        {questions.map((_, idx) => (
          <motion.div
            key={idx}
            className={cn(
              "h-1 rounded-full flex-1 transition-all duration-300",
              idx < currentIndex
                ? "bg-emerald-500"
                : idx === currentIndex
                  ? "bg-amber-500"
                  : "bg-zinc-800",
            )}
            animate={idx === currentIndex ? { scaleY: [1, 1.5, 1] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        ))}
      </div>

      {/* Question counter */}
      <p className="text-[10px] text-zinc-500 mb-3 font-mono">
        سؤال {currentIndex + 1} / {questions.length}
      </p>

      {/* Question text */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <h4 className="text-sm font-semibold text-zinc-200 mb-3 leading-relaxed font-arabic">
            {currentQuestion.question}
          </h4>

          <div className="space-y-2">
            {currentQuestion.choices.map((choice, cIdx) => {
              const isSelected = selections[currentIndex] === choice.theme;
              return (
                <motion.button
                  key={cIdx}
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => handleSelect(choice.theme)}
                  className={cn(
                    "w-full text-right p-3 rounded border transition-all duration-200 font-sans",
                    isSelected
                      ? "border-amber-500/50 bg-amber-500/10 text-white"
                      : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
                  )}
                >
                  <div className="flex items-start gap-2.5 flex-row-reverse">
                    <span
                      className={cn(
                        "shrink-0 w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center",
                        isSelected ? "border-amber-500 bg-amber-500" : "border-zinc-600",
                      )}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 text-zinc-900" />}
                    </span>
                    <div className="text-right">
                      <span className="text-[12px] font-semibold block font-arabic">{choice.title}</span>
                      <span className="text-[10px] text-zinc-500 mt-0.5 block font-arabic">{choice.description}</span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-4">
        {currentIndex > 0 ? (
          <button
            onClick={() => setCurrentIndex((p) => p - 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-all"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            السابق
          </button>
        ) : (
          <span />
        )}

        {hasSelected && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleNext}
            disabled={isSubmitting}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-semibold transition-all disabled:opacity-50",
              isLastQuestion && allAnswered
                ? "bg-gradient-to-l from-amber-500 to-orange-500 text-black hover:shadow-lg"
                : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700",
            )}
          >
            {isLastQuestion && allAnswered ? "إرسال الإجابات" : "التالي"}
            {!isLastQuestion && <ArrowLeft className="w-3.5 h-3.5" />}
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ─── Approved Choices Display ─────────────────────────────────────────────────

function ApprovedChoicesDisplay({
  choices,
}: {
  choices: { title: string; description: string }[];
}) {
  return (
    <div className="space-y-2" dir="rtl">
      <p className="text-[9px] font-mono font-bold text-amber-400 uppercase tracking-widest mb-2">
        المتطلبات المعتمدة:
      </p>
      {choices.map((choice, idx) => (
        <div
          key={idx}
          className="p-2.5 border-r-2 border-amber-500/40 pr-3 bg-zinc-900/30 rounded-r"
        >
          <div className="text-[11px] font-bold text-zinc-200 font-arabic">{choice.title}</div>
          <div className="text-[9.5px] text-zinc-500 mt-0.5 leading-normal font-arabic">{choice.description}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Phase 2 Confirmation Document Display ────────────────────────────────────

function Phase2ConfirmationDisplay({ content }: { content: string }) {
  // Extract page structure table from content
  const pageTableMatch = content.match(/\|([^\n]+\|){2,}[\s\S]*?(?=\n\n|\n#{1,3}|$)/);

  // Extract UI contract values
  const contractSection = content.match(/عقد مزامنة الواجهة[\s\S]*?(?=\n#{1,3}|خريطة|معايير|$)/i);

  // Extract event map
  const eventSection = content.match(/خريطة الأحداث[\s\S]*?(?=\n#{1,3}|معايير|$)/i);

  // Extract acceptance criteria
  const criteriaSection = content.match(/معايير القبول[\s\S]*$/i);

  const hasStructuredContent = pageTableMatch || contractSection || eventSection;

  if (!hasStructuredContent) return null;

  return (
    <div className="space-y-4 font-sans" dir="rtl">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
        <ClipboardList className="w-4 h-4 text-amber-400" />
        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider font-mono">
          وثيقة التأكيد — Requirements Confirmation
        </span>
      </div>

      {/* Page structure */}
      {content.includes("هيكل الصفحات") && (
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
            📄 هيكل الصفحات المعتمد
          </p>
          <div className="space-y-1.5">
            {[
              { page: "الرئيسية", route: "#home", icon: "🏠" },
              { page: "Services", route: "#services", icon: "⚡" },
              { page: "العروض", route: "#showcase", icon: "✨" },
              { page: "تواصل", route: "#contact", icon: "📬" },
              { page: "الأسئلة", route: "#faq", icon: "❓" },
            ].map((p, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-2.5 py-1.5 rounded border border-zinc-800/80 bg-zinc-900/30"
              >
                <span className="text-[10px] font-medium text-zinc-300 font-arabic">
                  {p.icon} {p.page}
                </span>
                <span className="text-[9px] font-mono text-amber-400/70 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/20">
                  {p.route}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* UI Contract */}
      {(contractSection || content.includes("is-active")) && (
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
            🔗 عقد الواجهة — CSS State Classes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "نشط", value: ".is-active", color: "emerald" },
              { label: "مخفي", value: ".is-hidden", color: "zinc" },
              { label: "نافذة منبثقة", value: ".modal-open", color: "violet" },
              { label: "إرسال", value: ".submitting", color: "amber" },
              { label: "خطأ إدخال", value: ".is-invalid", color: "red" },
            ].map((item, i) => (
              <span
                key={i}
                className={cn(
                  "text-[9px] font-mono px-2 py-1 rounded border",
                  item.color === "emerald" && "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
                  item.color === "zinc" && "border-zinc-700 bg-zinc-800/50 text-zinc-400",
                  item.color === "violet" && "border-violet-500/30 bg-violet-500/10 text-violet-400",
                  item.color === "amber" && "border-amber-500/30 bg-amber-500/10 text-amber-400",
                  item.color === "red" && "border-red-500/30 bg-red-500/10 text-red-400",
                )}
              >
                {item.value}
                <span className="text-zinc-600 ml-1">— {item.label}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Acceptance criteria badges */}
      {criteriaSection && (
        <div>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2 font-mono">
            ✅ معايير القبول
          </p>
          <div className="space-y-1">
            {[
              "التنقل الداخلي عبر hash routing",
              "اتساق محددات CSS و JavaScript",
              "تصميم متجاوب للجوال والتابلت",
              "مراجعة ذاتية قبل التجميع النهائي",
            ].map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />
                <span className="text-[10px] text-zinc-300 font-arabic">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export interface ApexCoderDashboardProps {
  state: UnboundState;
  content?: string;
  isStreaming?: boolean;
  onSelectChoice?: (choices: any) => void;
  workTree?: { root: WorkTreeNode; edges: WorkTreeEdge[] } | null;
  planText?: string | null;
}

export function ApexCoderDashboard({
  state,
  content = "",
  isStreaming = false,
  onSelectChoice,
  workTree,
  planText,
}: ApexCoderDashboardProps) {
  // Reconstruct phases dynamically if they are missing (e.g. fallback state)
  let phases = state.phases || [];
  if (phases.length === 0) {
    const defaultPhases = [
      { phase: 1, name: "Requirements Architecture — Formal Specification", status: "pending" as const },
      { phase: 2, name: "Requirements Confirmation — Configuration Brief", status: "pending" as const },
      { phase: 3, name: "Markup Engineering — Semantic DOM", status: "pending" as const },
      { phase: 4, name: "Interface Contract — Selector Registry", status: "pending" as const },
      { phase: 5, name: "Presentation and Logic — Parallel Build", status: "pending" as const },
      { phase: 6, name: "Quality Review — Integration Audit", status: "pending" as const },
      { phase: 7, name: "Release Packaging — Single Bundle", status: "pending" as const },
    ];

    let maxDetectedPhase = 0;
    const lines = content.split("\n");
    for (const rawLine of lines) {
      const match = rawLine.match(/\[Phase\s+(\d+)\/(\d+)\]/i);
      if (match) {
        const phNum = parseInt(match[1]);
        if (phNum > maxDetectedPhase) {
          maxDetectedPhase = phNum;
        }
      }
    }

    // Default to phase 7 if completed and no phase was parsed
    if (!isStreaming && maxDetectedPhase === 0) {
      maxDetectedPhase = 7;
    }

    phases = defaultPhases.map((dp) => {
      let status: "pending" | "running" | "done" = "pending";
      if (dp.phase < maxDetectedPhase) {
        status = "done";
      } else if (dp.phase === maxDetectedPhase) {
        status = isStreaming ? "running" : "done";
      } else {
        status = "pending";
      }
      return { ...dp, status };
    });
  }

  const completedCount = phases.filter((p) => p.status === "done").length;
  const totalPhases = phases.length;
  const progressPct = totalPhases > 0 ? Math.round((completedCount / totalPhases) * 100) : 0;

  const isArabic = /[\u0600-\u06FF]/.test(state.content || content || "");
  const isComplete = !state.isRunning && !state.error && (totalPhases > 0 ? completedCount === totalPhases : !isStreaming);

  // Determine which tabs are available
  const hasQuestions =
    state.questions && state.questions.length > 0 && !state.selectedChoices?.length;
  const hasApprovedChoices = state.selectedChoices && state.selectedChoices.length > 0;
  const hasWorkTree = !!workTree?.root;
  const hasPlan = !!planText;
  const hasConsole = content.length > 0;

  // Web gen steps detection
  const webGenSteps = WEB_GEN_STEPS.map((step, idx) => {
    const started = content.includes(step.marker);
    return { ...step, started, completed: false };
  });
  let activeWebGenIndex = -1;
  webGenSteps.forEach((step, idx) => {
    if (step.started) activeWebGenIndex = idx;
  });
  webGenSteps.forEach((step, idx) => {
    if (step.started) {
      const nextStarted = webGenSteps.slice(idx + 1).some((s) => s.started);
      step.completed = nextStarted || !isStreaming;
    }
  });
  const hasWebGen = activeWebGenIndex >= 0;

  // Phase 2 detection
  const hasPhase2Content =
    content.includes("وثيقة خطة التنفيذ") ||
    content.includes("هيكل الصفحات المعتمد") ||
    content.includes("Requirements Confirmation") ||
    (content.includes("عقد مزامنة") && content.includes("is-active"));

  // Determine active tab automatically
  const getAutoTab = (): TabId => {
    if (hasQuestions) return "phases";
    const runningPhase = phases.find((p) => p.status === "running");
    if (runningPhase) return "phases";
    if (hasWebGen && isStreaming) return "console";
    if (isComplete && hasPlan) return "plan";
    return "phases";
  };

  const [activeTab, setActiveTab] = useState<TabId>(getAutoTab);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-switch tab on state change
  useEffect(() => {
    if (hasQuestions) {
      setActiveTab("phases");
    } else if (isStreaming && hasWebGen) {
      setActiveTab("console");
    }
  }, [hasQuestions, isStreaming, hasWebGen]);

  // Logs
  const logs = hasConsole ? parseLogs(content) : [];

  // Plan sections
  const planSections = hasPlan ? parsePlanContent(planText!, content) : [];
  const totalPlanItems = planSections.reduce((acc, s) => acc + s.items.length, 0);
  const completedPlanItems = planSections.reduce(
    (acc, s) => acc + s.items.filter((i) => i.completed).length,
    0,
  );
  const planProgress = totalPlanItems > 0 ? Math.round((completedPlanItems / totalPlanItems) * 100) : 0;

  // Pixel bar config
  const TOTAL_BLOCKS = 36;
  const activeBlocks = Math.round((progressPct / 100) * TOTAL_BLOCKS);

  // Tabs config
  const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: "phases", label: "المراحل", icon: Layers },
    ...(hasPlan || hasPhase2Content || hasApprovedChoices
      ? [{ id: "plan" as TabId, label: "الخطة", icon: ClipboardList }]
      : []),
    ...(hasWorkTree ? [{ id: "worktree" as TabId, label: "شجرة العمل", icon: GitBranch }] : []),
    ...(logs.length > 0 ? [{ id: "console" as TabId, label: "Console", icon: Terminal }] : []),
  ];

  return (
    <motion.div
      data-testid="apex-coder-dashboard"
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="w-full font-mono relative"
    >
      <div
        className={cn(
          "w-full rounded-xl border bg-neutral-950 shadow-2xl overflow-hidden relative",
          isComplete ? "border-emerald-500/25" : "border-zinc-800",
        )}
      >
        {/* Top accent line */}
        <div
          className={cn(
            "absolute top-0 left-0 right-0 h-[2px] transition-all duration-700",
            isComplete ? "bg-emerald-500" : "bg-amber-500",
          )}
        />

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-3 select-none">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-zinc-800 bg-black flex items-center justify-center text-[11px] font-black text-white font-mono shrink-0">
              A
            </div>
            <div>
              <h3 className="text-[11px] font-black text-white tracking-widest uppercase font-mono leading-none">
                Apex Coder
              </h3>
              <p className="text-[8.5px] text-zinc-500 uppercase tracking-wider font-mono mt-0.5">
                {isArabic ? "لوحة تنفيذ وتدقيق المشروع" : "Project Execution Console"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Progress % */}
            <div className="text-right">
              <div
                className={cn(
                  "text-[15px] font-black font-mono leading-none",
                  isComplete ? "text-emerald-400" : "text-amber-400",
                )}
              >
                {progressPct}%
              </div>
              <div className="text-[7.5px] text-zinc-600 uppercase tracking-widest font-mono mt-0.5">
                {completedCount}/{totalPhases}
              </div>
            </div>

            {/* Collapse toggle */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              {isCollapsed ? (
                <Maximize2 className="w-3.5 h-3.5" />
              ) : (
                <Minimize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* ── PIXEL PROGRESS BAR ── */}
        <div className="flex gap-[2px] w-full px-4 pb-3 select-none">
          {Array.from({ length: TOTAL_BLOCKS }).map((_, i) => {
            const on = i < activeBlocks;
            return (
              <div key={i} className="flex-1 flex flex-col gap-[2px]">
                <div
                  className={cn(
                    "h-1.5 transition-all duration-300 rounded-sm",
                    on
                      ? isComplete
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                      : "bg-zinc-900",
                  )}
                />
                <div
                  className={cn(
                    "h-0.5",
                    on ? (isComplete ? "bg-emerald-500/30" : "bg-amber-500/20") : "bg-zinc-900/50",
                  )}
                />
              </div>
            );
          })}
        </div>

        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              {/* ── WAITING FOR INPUT NOTICE ── */}
              <AnimatePresence>
                {hasQuestions && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="mx-4 mb-3 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded flex items-center gap-2"
                    dir="rtl"
                  >
                    <motion.span
                      className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                    />
                    <div>
                      <div className="text-[10px] font-bold text-zinc-200 font-arabic">
                        بانتظار اعتماد المتطلبات
                      </div>
                      <div className="text-[8.5px] text-zinc-500 font-arabic">
                        {state.questions!.length} أسئلة ستظهر سؤالاً بسؤال
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── TAB BAR ── */}
              {tabs.length > 1 && (
                <div className="flex gap-0 border-b border-zinc-900 px-4" dir="rtl">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-2 text-[9.5px] font-bold uppercase tracking-wider font-mono transition-all border-b-2 -mb-px",
                          activeTab === tab.id
                            ? isComplete
                              ? "border-emerald-500 text-emerald-400"
                              : "border-amber-500 text-amber-400"
                            : "border-transparent text-zinc-600 hover:text-zinc-400",
                        )}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── TAB CONTENT ── */}
              <div className="px-4 py-3">
                <AnimatePresence mode="wait">
                  {/* PHASES TAB */}
                  {activeTab === "phases" && (
                    <motion.div
                      key="phases"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Questions (if active) */}
                      {hasQuestions && (
                        <div className="mb-3 p-3 border border-amber-500/20 rounded-lg bg-amber-500/5">
                          <InlineQuestionnaire
                            questions={state.questions!}
                            onComplete={(choices) => onSelectChoice?.(choices)}
                          />
                        </div>
                      )}

                      {/* Approved choices */}
                      {hasApprovedChoices && (
                        <div className="mb-3">
                          <ApprovedChoicesDisplay choices={state.selectedChoices!} />
                        </div>
                      )}

                      {/* Phase list */}
                      <div className="space-y-0">
                        {phases.map((phase, index) => (
                          <PhaseRow
                            key={phase.phase}
                            phase={phase}
                            index={index}
                            isArabic={isArabic}
                          />
                        ))}
                      </div>

                      {/* Web gen steps (if active, compact) */}
                      {hasWebGen && (
                        <div className="mt-3 pt-3 border-t border-zinc-900">
                          <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest mb-2 font-mono">
                            وكلاء توليد الكود
                          </p>
                          <div className="grid grid-cols-5 gap-1.5">
                            {webGenSteps.map((step, idx) => {
                              const StepIcon = step.icon;
                              const isActive = step.started && !step.completed;
                              const isDone = step.completed;
                              const isPending = !step.started;
                              return (
                                <div
                                  key={step.key}
                                  className={cn(
                                    "flex flex-col items-center gap-1 p-2 rounded border transition-all text-center",
                                    isDone && "border-emerald-500/20 bg-emerald-500/5",
                                    isActive && "border-amber-500/30 bg-amber-500/5",
                                    isPending && "border-zinc-900 opacity-40",
                                  )}
                                  title={isArabic ? step.labelAr : step.label}
                                >
                                  <StepIcon
                                    className={cn(
                                      "w-3.5 h-3.5",
                                      isDone && "text-emerald-400",
                                      isActive && "text-amber-400",
                                      isPending && "text-zinc-600",
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "text-[7.5px] font-bold font-mono uppercase leading-tight",
                                      isDone && "text-emerald-400",
                                      isActive && "text-amber-400",
                                      isPending && "text-zinc-600",
                                    )}
                                  >
                                    {step.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* PLAN TAB */}
                  {activeTab === "plan" && (
                    <motion.div
                      key="plan"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Phase 2 confirmation document */}
                      {hasPhase2Content && (
                        <div className="mb-3">
                          <Phase2ConfirmationDisplay content={content} />
                        </div>
                      )}

                      {/* Plan checklist */}
                      {planSections.length > 0 && (
                        <div>
                          {/* Plan progress */}
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                              خطة العمل التنفيذية
                            </p>
                            <span
                              className={cn(
                                "text-[9px] font-bold font-mono",
                                planProgress === 100 ? "text-emerald-400" : "text-amber-400",
                              )}
                            >
                              {completedPlanItems}/{totalPlanItems} ({planProgress}%)
                            </span>
                          </div>
                          <div className="space-y-3">
                            {planSections.map((section, sIdx) => (
                              <div key={sIdx}>
                                <h4 className="text-[9px] font-bold text-zinc-500 flex items-center gap-1.5 uppercase tracking-wider mb-1.5 font-mono">
                                  <span className="w-1 h-1 rounded-full bg-violet-500" />
                                  {section.title}
                                </h4>
                                <div className="space-y-1 pr-3 border-r border-zinc-900">
                                  {section.items.map((item, iIdx) => (
                                    <div
                                      key={iIdx}
                                      className="flex items-start gap-2 py-0.5"
                                    >
                                      <div className="mt-0.5 shrink-0">
                                        {item.completed ? (
                                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                                        ) : (
                                          <div className="w-3 h-3 rounded-full border border-zinc-700 bg-zinc-900/50 flex items-center justify-center">
                                            <Clock className="w-1.5 h-1.5 text-zinc-600" />
                                          </div>
                                        )}
                                      </div>
                                      <span
                                        className={cn(
                                          "text-[10px] leading-relaxed",
                                          item.completed
                                            ? "text-zinc-600 line-through"
                                            : "text-zinc-300",
                                        )}
                                      >
                                        {item.text}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {!hasPhase2Content && planSections.length === 0 && (
                        <p className="text-[10px] text-zinc-600 text-center py-4 font-mono">
                          لا توجد خطة تنفيذية بعد...
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* WORKTREE TAB */}
                  {activeTab === "worktree" && hasWorkTree && (
                    <motion.div
                      key="worktree"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">
                          شجرة العمل
                        </p>
                        <span className="text-[8px] text-zinc-600 font-mono">
                          {workTree!.edges?.length || 0} روابط
                        </span>
                      </div>
                      <div className="max-h-[280px] overflow-y-auto space-y-0.5">
                        <WorkTreeNodeView node={workTree!.root} />
                      </div>
                      {/* Legend */}
                      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-900 text-[8.5px] text-zinc-600">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="w-2.5 h-2.5 text-emerald-500" /> مكتمل
                        </span>
                        <span className="flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 text-amber-500" /> قيد التنفيذ
                        </span>
                        <span className="flex items-center gap-1">
                          <Circle className="w-2.5 h-2.5 text-zinc-700" /> معلق
                        </span>
                        <span className="flex items-center gap-1">
                          <AlertCircle className="w-2.5 h-2.5 text-red-500" /> خطأ
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* CONSOLE TAB */}
                  {activeTab === "console" && (
                    <motion.div
                      key="console"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Terminal className="w-3.5 h-3.5 text-violet-400" />
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 font-mono">
                          APEX Console Logs
                        </span>
                        {isStreaming && (
                          <span className="flex items-center gap-1 text-[8px] text-emerald-400">
                            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-ping" />
                            compiling...
                          </span>
                        )}
                        <span className="ml-auto text-[8px] text-zinc-700 font-mono">
                          {logs.length} lines
                        </span>
                      </div>
                      <div className="bg-zinc-950/80 rounded border border-zinc-900 p-3 max-h-[220px] overflow-y-auto font-mono text-[9.5px] leading-relaxed space-y-1 text-left">
                        {logs.length === 0 ? (
                          <p className="text-zinc-700">Waiting for output...</p>
                        ) : (
                          logs.map((log, idx) => {
                            let colorClass = "text-zinc-400";
                            if (log.type === "phase") colorClass = "text-violet-400 font-bold border-b border-zinc-900/60 pb-1 mt-2 first:mt-0";
                            else if (log.type === "success") colorClass = "text-emerald-400";
                            else if (log.type === "warning") colorClass = "text-amber-400";
                            else if (log.type === "error") colorClass = "text-red-400";
                            else if (log.type === "search") colorClass = "text-sky-400";
                            else if (log.type === "image") colorClass = "text-fuchsia-400";
                            else if (log.type === "info") colorClass = "text-zinc-500";
                            return (
                              <div key={idx} className={cn("whitespace-pre-wrap", colorClass)}>
                                {log.type !== "phase" && (
                                  <span className="text-zinc-700 mr-1.5 select-none">&gt;</span>
                                )}
                                {log.text}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── FOOTER ── */}
              <div className="px-4 py-2.5 border-t border-zinc-900 flex items-center justify-between">
                <span
                  className={cn(
                    "text-[8px] font-black tracking-widest uppercase font-mono",
                    isComplete ? "text-emerald-400" : "text-zinc-500",
                  )}
                >
                  {isComplete
                    ? "◉ PIPELINE COMPLETE"
                    : phases.some((p) => p.status === "running")
                      ? `◉ RUNNING PHASE ${phases.find((p) => p.status === "running")?.phase || "..."}`
                      : hasQuestions
                        ? "◉ AWAITING INPUT"
                        : "◉ PROCESSING"}
                </span>

                {/* Error state */}
                {state.error && (
                  <span className="text-[8px] text-red-400 font-mono">
                    ⚠ {state.error}
                  </span>
                )}

                {/* Complete badge */}
                {isComplete && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-1 text-[8px] font-bold text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded font-mono"
                  >
                    <CheckCircle className="w-2.5 h-2.5" />
                    ALL PHASES DONE
                  </motion.span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
