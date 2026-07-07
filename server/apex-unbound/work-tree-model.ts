// work-tree-model.ts - نموذج بيانات شجرة العمل
export type WorkTreeNodeType = "root" | "phase" | "agent" | "task" | "component" | "page" | "bundle";
export type WorkTreeNodeStatus = "pending" | "running" | "done" | "error" | "skipped";
export type WorkTreeEdgeType = "requires" | "generates" | "constrains" | "parallel";

export interface WorkTreeNode {
  id: string;
  label: string;
  labelAr?: string;            // Arabic label for RTL support
  type: WorkTreeNodeType;
  status: WorkTreeNodeStatus;
  children: WorkTreeNode[];
  expanded?: boolean;          // UI: expand/collapse state
  metadata?: {
    phase?: string;            // Pipeline phase name
    duration?: number;         // Execution time in ms
    summary?: string;          // Brief description of what this node produced
    errorMessage?: string;     // Error details if status is "error"
  };
}

export interface WorkTreeEdge {
  id: string;
  from: string;               // Source node ID
  to: string;                  // Target node ID
  label?: string;
  type: WorkTreeEdgeType;
  animated?: boolean;          // UI: animate edge when parent is "running"
}

export interface WorkTree {
  id: string;                  // Usually the conversation/message ID
  root: WorkTreeNode;
  edges: WorkTreeEdge[];
  timestamp: number;
  phase: string;               // Current pipeline phase
}
