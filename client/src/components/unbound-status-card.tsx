/**
 * APEX Unbound Status Card (V3 - Restructured)
 *
 * A premium retro terminal UI card that displays the real-time pipeline phases
 * as the APEX Unbound multi-agent system generates code.
 *
 * Designed to align with the stark black, pixel-grid progress bar theme.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UnboundState, UnboundPhase } from "@/lib/unbound-service";
import { Globe, X, ExternalLink, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

// Bilingual sub-tasks checklist
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
    { id: "p3-1", labelAr: "إنشاء هيكل الصفحة الهيكلي HTML5", labelEn: "Generate HTML5 Semantic DOM" },
    { id: "p3-2", labelAr: "إعداد تقسيمات الصفحة المرنة والشبكات", labelEn: "Set up layout grids & flexboxes" },
    { id: "p3-3", labelAr: "إدخل وسوم التسهيل والوصول ARIA", labelEn: "Inject accessibility tags (ARIA)" },
    { id: "p3-4", labelAr: "تضمين الأيقونات والشعارات المتجهة SVG", labelEn: "Embed SVG icons and logos" },
  ],
  4: [
    { id: "p4-1", labelAr: "تحليل شجرة الـ DOM المتولدة بالكامل", labelEn: "Parse generated DOM tree" },
    { id: "p4-2", labelAr: "استخراج معرّفات المكونات التفاعلية", labelEn: "Extract interactive component IDs" },
    { id: "p4-3", labelAr: "مطابقة فئات التنسيق ومحددات البرمجة", labelEn: "Sync CSS classes & JS selectors" },
  ],
  5: [
    { id: "p5-1", labelAr: "تجميع طبقة التنسيق المتجاوبة", labelEn: "Compile the responsive presentation layer" },
    { id: "p5-2", labelAr: "برمجة طبقة التفاعل والتنقل", labelEn: "Build the interaction and routing layer" },
    { id: "p5-3", labelAr: "مواءمة الحالات المرئية مع عقد الواجهة", labelEn: "Align visual states with the UI contract" },
    { id: "p5-4", labelAr: "التحقق من استجابة الأحداث", labelEn: "Validate event handlers" },
  ],
  6: [
    { id: "p6-1", labelAr: "فحص تطابق محددات HTML و CSS و JS", labelEn: "Audit HTML/CSS/JS selector alignment" },
    { id: "p6-2", labelAr: "تصحيح محرك التنقل الداخلي وحالات الواجهة", labelEn: "Correct router and UI state contract usage" },
    { id: "p6-3", labelAr: "منع أخطاء null و undefined قبل المعاينة", labelEn: "Prevent null and undefined runtime errors" },
  ],
  7: [
    { id: "p7-1", labelAr: "دمج كتل الكود في ملف واحد", labelEn: "Bundle HTML, CSS, and JS assets" },
    { id: "p7-2", labelAr: "إعداد وسوم الشاشة والـ Meta للـ SEO", labelEn: "Set viewport and meta tags" },
    { id: "p7-3", labelAr: "تضمين الخطوط وحزم التشغيل الضرورية", labelEn: "Inject custom fonts & CDN packages" },
    { id: "p7-4", labelAr: "فحص جاهزية العرض والمعاينة المباشرة", labelEn: "Verify preview performance & rendering" },
  ],
};

interface UnboundPhaseRowProps {
  phase: UnboundPhase;
  index: number;
  isArabic: boolean;
}

function UnboundPhaseRow({ phase, index, isArabic }: UnboundPhaseRowProps) {
  const isRunning = phase.status === "running";
  const isDone = phase.status === "done";
  const isError = phase.status === "error";
  const isPending = phase.status === "pending";

  const subtasks = PHASE_SUBTASKS[phase.phase] || [];
  const [activeSubIndex, setActiveSubIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isRunning) {
      if (isDone) {
        setActiveSubIndex(subtasks.length);
      } else {
        setActiveSubIndex(0);
      }
      return;
    }

    setActiveSubIndex(0);

    const interval = setInterval(() => {
      setActiveSubIndex((prev) => {
        if (prev < subtasks.length - 1) {
          return prev + 1;
        }
        return prev;
      });
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
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={cn(
        "flex flex-col p-3 rounded border mb-2 font-mono transition-all",
        isRunning
          ? "border-amber-500 bg-amber-950/10"
          : isDone
            ? "border-emerald-500/20 bg-emerald-950/5"
            : "border-zinc-900 bg-zinc-950/20 opacity-50"
      )}
    >
      <div 
        onClick={() => {
          if (!isPending) {
            setIsExpanded(!isExpanded);
          }
        }}
        className={cn(
          "flex items-center justify-between gap-3 width-full",
          isPending ? "cursor-default" : "cursor-pointer"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0 text-start">
          {/* Monospace Phase ID Bracket */}
          <span className={cn(
            "text-xs font-bold font-mono tracking-wider",
            isRunning ? "text-amber-400" : isDone ? "text-emerald-400" : "text-zinc-600"
          )}>
            [{String(phase.phase).padStart(2, "0")}]
          </span>

          {/* Phase Name */}
          <span className={cn(
            "text-[11px] font-bold uppercase tracking-wider font-mono",
            isRunning ? "text-white" : isDone ? "text-zinc-300" : "text-zinc-500"
          )}>
            {phase.name}
          </span>

          {/* Duration or Live Tags */}
          {isRunning && (
            <span className="text-[7.5px] px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold uppercase tracking-widest animate-pulse">
              RUNNING
            </span>
          )}
          {isDone && phase.durationMs && (
            <span className="text-[7.5px] px-1.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-mono">
              {(phase.durationMs / 1000).toFixed(1)}S
            </span>
          )}
        </div>

        {/* Monospace Dropdown Trigger */}
        {!isPending && (
          <span className="text-zinc-500 hover:text-white transition-colors text-[9px] font-bold uppercase select-none">
            {isExpanded ? "[ HIDE ]" : "[ LOGS ]"}
          </span>
        )}
      </div>

      {/* Subtasks logs */}
      <AnimatePresence>
        {isExpanded && (isRunning || isDone || isError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            dir={isArabic ? "rtl" : "ltr"}
            className={cn(
              "mt-3 pt-2.5 border-t border-dashed border-zinc-800/80 flex flex-col gap-2 font-mono text-[9px] text-zinc-400",
              isArabic ? "text-right pr-2" : "text-left pl-2"
            )}
          >
            {subtasks.map((sub, subIdx) => {
              const subStatus = getSubtaskStatus(subIdx);
              return (
                <div
                  key={sub.id}
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    subStatus === "pending" ? "opacity-35" : "opacity-100"
                  )}
                >
                  {/* Flat brackets status prefix */}
                  <span className={cn(
                    "font-bold select-none shrink-0 text-[8px]",
                    subStatus === "done" ? "text-emerald-400" : subStatus === "running" ? "text-amber-400" : "text-zinc-600"
                  )}>
                    {subStatus === "done" ? "[OK]" : subStatus === "running" ? "[>]" : "[.]"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="font-semibold tracking-wide font-mono">
                      {isArabic ? sub.labelAr : sub.labelEn}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface UnboundStatusCardProps {
  state: UnboundState;
  onSelectChoice?: (choices: any) => void;
}

export function UnboundStatusCard({ state }: UnboundStatusCardProps) {
  const completedCount = state.phases.filter((p) => p.status === "done").length;
  const totalPhases = state.phases.length;
  const progressPct = Math.round((completedCount / totalPhases) * 100);
  const questionCount = state.questions?.length || 0;
  const isWaitingForInput = questionCount > 0 && (!state.selectedChoices || state.selectedChoices.length === 0);

  const isArabic = /[\u0600-\u06FF]/.test(state.content || "");

  // Pixel blocks configuration
  const totalBlocks = 40;
  const activeBlocks = Math.round((progressPct / 100) * totalBlocks);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className="w-full rounded-xl border border-zinc-800 bg-neutral-950 p-6 shadow-2xl relative overflow-hidden font-mono bg-[radial-gradient(#e5e7eb03_1px,transparent_1px)] [background-size:16px_16px]"
    >
      {/* Top Border Accent Line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-[2px] transition-all duration-700",
        progressPct === 100 ? "bg-emerald-500" : "bg-amber-500"
      )} />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 select-none">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded border border-zinc-800 bg-black flex items-center justify-center text-xs font-black text-white font-mono">
            A
          </div>
          <div>
            <h3 className="text-xs font-black text-white tracking-widest uppercase font-mono">
              APEX Unbound
            </h3>
            <p className="text-[9px] text-zinc-500 uppercase tracking-wider font-mono">
              {isArabic ? "لوحة تنفيذ وتدقيق المشروع" : "Project Execution and Review Console"}
            </p>
          </div>
        </div>

        <div className="text-end">
          <div className={cn(
            "text-[18px] font-black font-mono leading-none",
            progressPct === 100 ? "text-emerald-400" : "text-amber-400"
          )}>
            {progressPct}%
          </div>
          <div className="text-[8px] text-zinc-500 uppercase tracking-widest font-mono mt-0.5">
            {completedCount}/{totalPhases} PHASES
          </div>
        </div>
      </div>

      {/* Double-Row Pixel Grid Progress Bar */}
      <div className="flex gap-[2px] w-full py-1 mb-4 select-none">
        {Array.from({ length: totalBlocks }).map((_, i) => {
          const isActive = i < activeBlocks;
          return (
            <div key={i} className="flex-1 flex flex-col gap-[2px]">
              <div
                className={cn(
                  "h-2 transition-all duration-300",
                  isActive
                    ? progressPct === 100
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                    : "bg-zinc-900"
                )}
              />
              <div
                className={cn(
                  "h-2 transition-all duration-300",
                  isActive
                    ? progressPct === 100
                      ? "bg-emerald-500"
                      : "bg-amber-500"
                    : "bg-zinc-900"
                )}
              />
            </div>
          );
        })}
      </div>

      {/* Phase list */}
      <div className="space-y-1.5">
        {state.phases.map((phase, index) => (
          <UnboundPhaseRow key={phase.phase} phase={phase} index={index} isArabic={isArabic} />
        ))}
      </div>

      {/* Waiting for input summary */}
      <AnimatePresence>
        {isWaitingForInput && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded font-mono text-[9px]"
            dir={isArabic ? "rtl" : "ltr"}
          >
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
              <div>
                <div className="font-bold text-zinc-300">
                  {isArabic ? "بانتظار اعتماد المتطلبات من خانة الإدخال" : "Waiting for requirement approval from the chat input"}
                </div>
                <div className="text-zinc-500 mt-0.5">
                  {isArabic ? `${questionCount} أسئلة ستظهر سؤالًا بسؤال` : `${questionCount} questions will appear one at a time`}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Selected Choices Summary */}
      {state.selectedChoices && state.selectedChoices.length > 0 && (
        <div className="mt-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded flex flex-col gap-2 font-mono text-[9px]">
          <div className="font-bold text-amber-500">
            {isArabic ? "المتطلبات المعتمدة:" : "Approved requirements:"}
          </div>
          <div className="flex flex-col gap-2.5">
            {state.selectedChoices.map((choice, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "border-zinc-800 py-0.5",
                  isArabic ? "text-right pr-2 border-r-2" : "text-left pl-2 border-l-2"
                )}
              >
                <div className="font-extrabold text-zinc-200">{choice.title}</div>
                <div className="text-zinc-500 mt-0.5 leading-normal">{choice.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 p-3 bg-red-950/20 border border-red-900/40 rounded text-[9px] text-red-400 font-mono"
        >
          {isArabic ? "خطأ في التوليد: " : "Error: "} {state.error}
        </motion.div>
      )}

      {/* Completion message */}
      {!state.isRunning && !state.error && completedCount === totalPhases && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 p-3 bg-emerald-950/10 border border-emerald-900/30 rounded text-[9px] text-emerald-400 font-mono flex items-center gap-2"
        >
          <span>[✓]</span>
          <span>
            {isArabic 
              ? "اكتمل التوليد بنجاح — قدم جميع الوكلاء مخرجات خالية من الأخطاء" 
              : "Pipeline complete — All agents delivered zero-error output"}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
