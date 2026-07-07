// work-tree-generator.ts - منشئ شجرة العمل من SystemSpec ومراحل pipeline
import { WorkTree, WorkTreeNode, WorkTreeEdge, WorkTreeNodeStatus } from "./work-tree-model";
import type { SystemSpec } from "./architect-agent.js";

type PhaseStatus = "pending" | "running" | "done" | "error";

export interface PhaseState {
  architect: PhaseStatus;
  questions: PhaseStatus;
  html: PhaseStatus;
  selectorSync: PhaseStatus;
  css: PhaseStatus;
  js: PhaseStatus;
  selfCorrection: PhaseStatus;
  bundle: PhaseStatus;
}

export function buildWorkTree(
  spec: SystemSpec | null,
  phases: PhaseState,
  conversationId: string
): WorkTree {
  const edges: WorkTreeEdge[] = [];

  const projectName = spec?.projectTitle || "Apex Coder Project";
  const rootNode: WorkTreeNode = {
    id: "root",
    label: `Project: ${projectName}`,
    labelAr: `المشروع: ${projectName}`,
    type: "root",
    status: getAggregateStatus(phases),
    children: [],
    expanded: true,
  };

  // --- PHASE 1: Architecture ---
  const archNode = createPhaseNode("phase-arch", "Architecture Analysis", "تحليل المعمارية", phases.architect);
  rootNode.children.push(archNode);
  edges.push(createEdge("root", "phase-arch", "starts", "requires"));

  if (spec?.pages) {
    for (const page of spec.pages) {
      const pageNode: WorkTreeNode = {
        id: `page-${sanitizeId(page.title || page.id)}`,
        label: page.title || page.id || "Page",
        labelAr: undefined,
        type: "page",
        status: phases.architect === "done" ? "done" : "pending",
        children: [],
        metadata: { summary: `${page.componentIds?.length || 0} components` },
      };
      archNode.children.push(pageNode);
    }
  }

  if (spec?.components) {
    for (const comp of spec.components) {
      const compNode: WorkTreeNode = {
        id: `comp-${sanitizeId(comp.name || comp.id)}`,
        label: comp.name || comp.id || "Component",
        type: "component",
        status: phases.architect === "done" ? "done" : "pending",
        children: [],
        metadata: { summary: comp.hasInteractivity ? "Interactive" : "Static" },
      };
      archNode.children.push(compNode);
    }
  }

  // --- PHASE 2: Questions ---
  const qNode = createPhaseNode("phase-questions", "Design Questionnaire", "الأسئلة التصميمية", phases.questions);
  rootNode.children.push(qNode);
  edges.push(createEdge("phase-arch", "phase-questions", "generates questions", "generates"));

  // --- PHASE 3: HTML ---
  const htmlNode = createPhaseNode("phase-html", "HTML Generation", "توليد HTML", phases.html);
  rootNode.children.push(htmlNode);
  edges.push(createEdge("phase-questions", "phase-html", "feeds spec", "generates"));

  // --- PHASE 4: Selector Sync ---
  const selNode = createPhaseNode("phase-sel", "Selector Registry", "سجل المحددات", phases.selectorSync);
  rootNode.children.push(selNode);
  edges.push(createEdge("phase-html", "phase-sel", "extracts selectors", "generates"));

  // --- PHASE 5: CSS + JS (Parallel) ---
  const cssNode = createPhaseNode("phase-css", "CSS Stylesheet", "توليد CSS", phases.css);
  const jsNode = createPhaseNode("phase-js", "JavaScript Logic", "توليد JavaScript", phases.js);
  rootNode.children.push(cssNode);
  rootNode.children.push(jsNode);
  edges.push(createEdge("phase-sel", "phase-css", "constrains selectors", "constrains"));
  edges.push(createEdge("phase-sel", "phase-js", "constrains selectors", "constrains"));
  edges.push({
    id: "edge-css-js-parallel",
    from: "phase-css",
    to: "phase-js",
    label: "parallel",
    type: "parallel",
    animated: false,
  });

  // --- PHASE 6: Self-Correction ---
  const corrNode = createPhaseNode("phase-corr", "Quality Review", "مراجعة الجودة", phases.selfCorrection);
  rootNode.children.push(corrNode);
  edges.push(createEdge("phase-css", "phase-corr", "feeds output", "requires"));
  edges.push(createEdge("phase-js", "phase-corr", "feeds output", "requires"));

  // --- PHASE 7: Bundle ---
  const bundleNode = createPhaseNode("phase-bundle", "Bundle Assembly", "تجميع الملف النهائي", phases.bundle);
  rootNode.children.push(bundleNode);
  edges.push(createEdge("phase-corr", "phase-bundle", "provides corrected code", "generates"));

  return {
    id: conversationId,
    root: rootNode,
    edges,
    timestamp: Date.now(),
    phase: getCurrentPhase(phases),
  };
}

function createPhaseNode(id: string, label: string, labelAr: string, status: PhaseStatus): WorkTreeNode {
  const statusMap: Record<PhaseStatus, WorkTreeNodeStatus> = {
    pending: "pending",
    running: "running",
    done: "done",
    error: "error",
  };
  return { id, label, labelAr, type: "phase", status: statusMap[status], children: [] };
}

function createEdge(from: string, to: string, label: string, type: WorkTreeEdge["type"]): WorkTreeEdge {
  return { id: `edge-${from}-${to}`, from, to, label, type };
}

function getAggregateStatus(phases: PhaseState): WorkTreeNodeStatus {
  if (phases.bundle === "done") return "done";
  const vals = Object.values(phases);
  if (vals.some(s => s === "error")) return "error";
  if (vals.some(s => s === "running")) return "running";
  if (vals.some(s => s === "done")) return "running";
  return "pending";
}

function getCurrentPhase(phases: PhaseState): string {
  const order = ["architect", "questions", "html", "selectorSync", "css", "js", "selfCorrection", "bundle"];
  for (const phase of order) {
    if (phases[phase as keyof PhaseState] === "running" || phases[phase as keyof PhaseState] === "pending")
      return phase;
  }
  return "bundle";
}

function sanitizeId(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, "-").replace(/^-+|-+$/g, "");
}
