/**
 * APEX Unbound Status Card
 *
 * A premium animated UI card that displays the real-time pipeline phases
 * as the APEX Unbound multi-agent system generates code.
 *
 * Shows each of the 5 phases with animated status indicators,
 * live progress, and phase metadata.
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { UnboundState, UnboundPhase } from "@/lib/unbound-service";

// Phase colors
const PHASE_CONFIG: Record<number, { color: string; bgColor: string }> = {
  1: { color: "#a78bfa", bgColor: "rgba(167, 139, 250, 0.08)" },
  2: { color: "#60a5fa", bgColor: "rgba(96, 165, 250, 0.08)" },
  3: { color: "#34d399", bgColor: "rgba(52, 211, 153, 0.08)" },
  4: { color: "#fbbf24", bgColor: "rgba(251, 191, 36, 0.08)" },
  5: { color: "#f472b6", bgColor: "rgba(244, 114, 182, 0.08)" },
};

// Bilingual sub-tasks checklist
const PHASE_SUBTASKS: Record<number, Array<{ id: string; labelAr: string; labelEn: string }>> = {
  1: [
    { id: "p1-1", labelAr: "تحليل متطلبات المستخدم بدقة", labelEn: "Analyze user request requirements" },
    { id: "p1-2", labelAr: "تحديد لوحة الألوان والخطوط المتناسقة", labelEn: "Choose color palette and typography" },
    { id: "p1-3", labelAr: "تخطيط هيكل المكونات والتوزيع العام", labelEn: "Design components structure & layout" },
    { id: "p1-4", labelAr: "استخراج محددات عناصر الـ DOM المخططة", labelEn: "Extract DOM selector tokens" },
  ],
  2: [
    { id: "p2-1", labelAr: "إنشاء هيكل الصفحة الهيكلي HTML5", labelEn: "Generate HTML5 Semantic DOM" },
    { id: "p2-2", labelAr: "إعداد تقسيمات الصفحة المرنة والشبكات", labelEn: "Set up layout grids & flexboxes" },
    { id: "p2-3", labelAr: "إدخال وسوم التسهيل والوصول ARIA", labelEn: "Inject accessibility tags (ARIA)" },
    { id: "p2-4", labelAr: "تضمين الأيقونات والشعارات المتجهة SVG", labelEn: "Embed SVG icons and logos" },
  ],
  3: [
    { id: "p3-1", labelAr: "تحليل شجرة الـ DOM المتولدة بالكامل", labelEn: "Parse generated DOM tree" },
    { id: "p3-2", labelAr: "استخراج معرّفات المكونات التفاعلية", labelEn: "Extract interactive component IDs" },
    { id: "p3-3", labelAr: "مطابقة فئات التنسيق ومحددات البرمجة", labelEn: "Sync CSS classes & JS selectors" },
    { id: "p3-4", labelAr: "مطابقة الأحداث وموقع العناصر في الصفحة", labelEn: "Map events and layout structure" },
  ],
  4: [
    { id: "p4-1", labelAr: "تجميع التنسيقات المتجاوبة والتأثيرات", labelEn: "Compile responsive styles (CSS)" },
    { id: "p4-2", labelAr: "برمجة الحركات ومهام التفاعل والمنطق", labelEn: "Program interactive states & logic (JS)" },
    { id: "p4-3", labelAr: "تحسين الحركات وتجربة المظهر الداكن", labelEn: "Optimize animations & dark mode" },
    { id: "p4-4", labelAr: "التحقق من سلامة الأكواد واستجابة الأحداث", labelEn: "Validate event listeners & handlers" },
  ],
  5: [
    { id: "p5-1", labelAr: "دمج كتل الكود في ملفات مستقلة", labelEn: "Bundle HTML, CSS, and JS assets" },
    { id: "p5-2", labelAr: "إعداد وسوم الشاشة والـ Meta للـ SEO", labelEn: "Set viewport and meta tags" },
    { id: "p5-3", labelAr: "تضمين الخطوط وحزم التشغيل الضرورية", labelEn: "Inject custom fonts & CDN packages" },
    { id: "p5-4", labelAr: "فحص جاهزية العرض والمعاينة المباشرة", labelEn: "Verify preview performance & rendering" },
  ],
};

interface UnboundPhaseRowProps {
  phase: UnboundPhase;
  index: number;
  isArabic: boolean;
}

function UnboundPhaseRow({ phase, index, isArabic }: UnboundPhaseRowProps) {
  const config = PHASE_CONFIG[phase.phase] || { color: "#a1a1aa", bgColor: "rgba(161, 161, 170, 0.08)" };
  const isRunning = phase.status === "running";
  const isDone = phase.status === "done";
  const isError = phase.status === "error";
  const isPending = phase.status === "pending";

  const subtasks = PHASE_SUBTASKS[phase.phase] || [];
  const [activeSubIndex, setActiveSubIndex] = useState(0);

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
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      style={{
        display: "flex",
        flexDirection: "column",
        padding: "12px 14px",
        borderRadius: "10px",
        background: isRunning ? config.bgColor : isDone ? "rgba(52, 211, 153, 0.03)" : "transparent",
        border: `1px solid ${isRunning ? config.color + "30" : isDone ? "#34d39920" : "transparent"}`,
        transition: "all 0.3s ease",
        marginBottom: "8px",
        opacity: isPending ? 0.45 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        {/* Status Indicator */}
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            fontWeight: "bold",
            fontFamily: "monospace",
            flexShrink: 0,
            background: isRunning ? config.bgColor : isDone ? "rgba(52, 211, 153, 0.1)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${isRunning ? config.color + "50" : isDone ? "#34d39950" : "#ffffff12"}`,
            color: isRunning ? config.color : isDone ? "#34d399" : isError ? "#f87171" : "#71717a",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {isRunning && (
            <motion.div
              style={{
                position: "absolute",
                inset: 0,
                background: `conic-gradient(${config.color}50, transparent)`,
                borderRadius: "50%",
              }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
          )}
          <span style={{ position: "relative", zIndex: 1 }}>
            {isDone ? "✓" : isError ? "!" : `${phase.phase}`}
          </span>
        </div>

        {/* Phase Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "13px",
                fontWeight: isRunning ? 600 : 500,
                color: isRunning ? config.color : isDone ? "#a1a1aa" : "#71717a",
                lineHeight: 1.3,
                fontFamily: isArabic ? "'Cairo', 'Tajawal', sans-serif" : "'Inter', sans-serif",
              }}
            >
              {phase.name}
            </span>

            {isRunning && (
              <motion.span
                style={{
                  fontSize: "10px",
                  color: config.color,
                  background: config.bgColor,
                  border: `1px solid ${config.color}40`,
                  padding: "1px 7px",
                  borderRadius: "20px",
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                Running
              </motion.span>
            )}

            {isDone && phase.durationMs && (
              <span
                style={{
                  fontSize: "10px",
                  color: "#34d399",
                  background: "rgba(52, 211, 153, 0.1)",
                  border: "1px solid rgba(52, 211, 153, 0.25)",
                  padding: "1px 7px",
                  borderRadius: "20px",
                  fontWeight: 500,
                }}
              >
                {(phase.durationMs / 1000).toFixed(1)}s
              </span>
            )}
          </div>

          {phase.detail && (
            <div
              style={{
                fontSize: "11px",
                color: "#71717a",
                marginTop: "2px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {phase.detail}
            </div>
          )}
        </div>
      </div>

      {/* Detailed subtasks checklist */}
      {(isRunning || isDone || isError) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          dir={isArabic ? "rtl" : "ltr"}
          style={{
            marginTop: "12px",
            paddingLeft: isArabic ? "0" : "12px",
            paddingRight: isArabic ? "12px" : "0",
            borderLeft: isArabic ? "none" : "1px dashed rgba(255, 255, 255, 0.08)",
            borderRight: isArabic ? "1px dashed rgba(255, 255, 255, 0.08)" : "none",
            marginLeft: isArabic ? "0" : "14px",
            marginRight: isArabic ? "14px" : "0",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          {subtasks.map((sub, subIdx) => {
            const subStatus = getSubtaskStatus(subIdx);
            return (
              <div
                key={sub.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  opacity: subStatus === "pending" ? 0.35 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                {/* Checkbox / status icon */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "16px", height: "16px", flexShrink: 0 }}>
                  {subStatus === "done" && (
                    <svg style={{ width: "14px", height: "14px", color: "#10b981" }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {subStatus === "running" && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
                    </span>
                  )}
                  {subStatus === "pending" && (
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", border: "1px solid #3f3f46", backgroundColor: "transparent" }} />
                  )}
                  {subStatus === "error" && (
                    <span style={{ color: "#ef4444", fontWeight: "bold", fontSize: "11px" }}>!</span>
                  )}
                </div>

                {/* Subtask Text */}
                <div style={{ textAlign: "start" }}>
                  <p
                    style={{
                      fontSize: "11.5px",
                      fontWeight: subStatus === "running" ? 600 : 400,
                      color: subStatus === "done" ? "#a1a1aa" : subStatus === "running" ? config.color : "#71717a",
                      fontFamily: isArabic ? "'Cairo', 'Tajawal', sans-serif" : "'Inter', sans-serif",
                      margin: 0,
                    }}
                  >
                    {isArabic ? sub.labelAr : sub.labelEn}
                  </p>
                  {isArabic && (
                    <p style={{ fontSize: "9px", color: "#52525b", margin: 0, fontFamily: "'Inter', sans-serif" }}>
                      {sub.labelEn}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}

interface UnboundStatusCardProps {
  state: UnboundState;
}

export function UnboundStatusCard({ state }: UnboundStatusCardProps) {
  const completedCount = state.phases.filter((p) => p.status === "done").length;
  const totalPhases = state.phases.length;
  const progressPct = Math.round((completedCount / totalPhases) * 100);

  // Detect Arabic content to set general page alignment and language support
  const isArabic = /[\u0600-\u06FF]/.test(state.content || "");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        background: "linear-gradient(135deg, rgba(15,15,25,0.95) 0%, rgba(10,10,20,0.98) 100%)",
        border: "1px solid rgba(139, 92, 246, 0.25)",
        borderRadius: "16px",
        padding: "20px",
        marginBottom: "16px",
        boxShadow: "0 4px 32px rgba(139, 92, 246, 0.08), 0 0 0 1px rgba(255,255,255,0.03) inset",
        backdropFilter: "blur(20px)",
        fontFamily: "'Inter', 'Cairo', 'Tajawal', sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          flexWrap: "wrap",
          gap: "8px",
          flexDirection: isArabic ? "row-reverse" : "row",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexDirection: isArabic ? "row-reverse" : "row" }}>
          <motion.div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              boxShadow: "0 0 16px rgba(139, 92, 246, 0.4)",
            }}
            animate={state.isRunning ? { boxShadow: ["0 0 16px rgba(139,92,246,0.4)", "0 0 28px rgba(139,92,246,0.7)", "0 0 16px rgba(139,92,246,0.4)"] } : {}}
            transition={{ duration: 1.8, repeat: Infinity }}
          >
            ∞
          </motion.div>
          <div style={{ textAlign: isArabic ? "right" : "left" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#e4e4e7",
                letterSpacing: "-0.01em",
              }}
            >
              APEX Unbound
            </div>
            <div style={{ fontSize: "11px", color: "#71717a" }}>
              {isArabic ? "محرك التوليد البرمجي متعدد الوكلاء" : "Multi-Agent Code Synthesis Pipeline"}
            </div>
          </div>
        </div>

        <div style={{ textAlign: isArabic ? "left" : "right" }}>
          <div
            style={{
              fontSize: "22px",
              fontWeight: 800,
              color: progressPct === 100 ? "#34d399" : "#a78bfa",
              lineHeight: 1,
            }}
          >
            {progressPct}%
          </div>
          <div style={{ fontSize: "10px", color: "#52525b", marginTop: "1px" }}>
            {completedCount}/{totalPhases} {isArabic ? "مراحل مكتملة" : "phases"}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "3px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "4px",
          marginBottom: "16px",
          overflow: "hidden",
        }}
      >
        <motion.div
          style={{
            height: "100%",
            background: progressPct === 100
              ? "linear-gradient(90deg, #34d399, #10b981)"
              : "linear-gradient(90deg, #8b5cf6, #a78bfa, #6d28d9)",
            borderRadius: "4px",
          }}
          initial={{ width: "0%" }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* Phase list */}
      <div>
        {state.phases.map((phase, index) => (
          <UnboundPhaseRow key={phase.phase} phase={phase} index={index} isArabic={isArabic} />
        ))}
      </div>

      {/* Error state */}
      {state.error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#f87171",
            textAlign: isArabic ? "right" : "left",
          }}
        >
          {isArabic ? "خطأ في التوليد: " : "Error: "} {state.error}
        </motion.div>
      )}

      {/* Completion message */}
      {!state.isRunning && !state.error && completedCount === totalPhases && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "rgba(52, 211, 153, 0.08)",
            border: "1px solid rgba(52, 211, 153, 0.2)",
            borderRadius: "8px",
            fontSize: "12px",
            color: "#34d399",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flexDirection: isArabic ? "row-reverse" : "row",
          }}
        >
          <span>✓</span>
          <span>
            {isArabic 
              ? "اكتمل التوليد بنجاح — قدمت جميع الوكلاء الخمسة مخرجات خالية من الأخطاء" 
              : "Pipeline complete — All 5 agents delivered zero-error output"}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
