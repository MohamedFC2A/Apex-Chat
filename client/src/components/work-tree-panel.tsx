// work-tree-panel.tsx - مكون شجرة العمل البصرية
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ChevronDown, CheckCircle, Loader2, AlertCircle, Circle } from "lucide-react";

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

interface WorkTreePanelProps {
  tree: { root: WorkTreeNode; edges: WorkTreeEdge[] } | null;
  isRTL?: boolean;
  className?: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  pending: { bg: "bg-zinc-800/50", text: "text-zinc-500", border: "border-zinc-700/50" },
  running: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  done: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  error: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  skipped: { bg: "bg-zinc-800/30", text: "text-zinc-600", border: "border-zinc-700/30" },
};

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "done": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    case "running": return <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />;
    case "error": return <AlertCircle className="w-4 h-4 text-red-500" />;
    default: return <Circle className="w-4 h-4 text-zinc-600" />;
  }
}

function TreeNode({ node, depth = 0, isRTL = false }: { node: WorkTreeNode; depth: number; isRTL: boolean }) {
  const [expanded, setExpanded] = useState(node.expanded !== false);
  const colors = STATUS_COLORS[node.status] || STATUS_COLORS.pending;
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: depth * 0.03 }}
        className={`
          flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer
          ${colors.bg} border border-transparent ${colors.border}
          hover:border-zinc-600/50 transition-all duration-200
        `}
        style={{ marginLeft: isRTL ? 0 : depth * 16, marginRight: isRTL ? depth * 16 : 0 }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <span className="flex-shrink-0 w-4">
          {hasChildren && (
            expanded
              ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
              : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          )}
        </span>
        <span className="flex-shrink-0">
          <StatusIcon status={node.status} />
        </span>
        <span className={`text-sm font-medium ${colors.text} truncate`}>
          {isRTL && node.labelAr ? node.labelAr : node.label}
        </span>
        {node.status === "running" && (
          <motion.span
            className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 ml-auto"
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
            transition={{ duration: 0.2 }}
          >
            {node.children.map((child) => (
              <div key={child.id} className="relative">
                <TreeNode node={child} depth={depth + 1} isRTL={isRTL} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function WorkTreePanel({ tree, isRTL = false, className = "" }: WorkTreePanelProps) {
  if (!tree || !tree.root) {
    return (
      <div className={`p-4 text-center text-zinc-500 text-sm ${className}`}>
        {isRTL ? "في انتظار بدء تحليل المشروع..." : "Waiting for project analysis to begin..."}
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-xl p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-800">
        <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
          {isRTL ? "شجرة العمل" : "Work Tree"}
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs text-zinc-500 font-mono">
            {tree.edges?.length || 0} {isRTL ? "رابط" : "edges"}
          </span>
        </div>
      </div>

      <div className="space-y-0.5 max-h-[400px] overflow-y-auto custom-scrollbar">
        <TreeNode node={tree.root} depth={0} isRTL={isRTL} />
      </div>

      <div className="flex items-center gap-4 mt-3 pt-2 border-t border-zinc-800 text-xs text-zinc-600">
        <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-emerald-500" /> {isRTL ? "مكتمل" : "Done"}</span>
        <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 text-amber-500 animate-spin" /> {isRTL ? "قيد التنفيذ" : "Running"}</span>
        <span className="flex items-center gap-1"><Circle className="w-3 h-3 text-zinc-600" /> {isRTL ? "معلق" : "Pending"}</span>
        <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-red-500" /> {isRTL ? "خطأ" : "Error"}</span>
      </div>
    </div>
  );
}
