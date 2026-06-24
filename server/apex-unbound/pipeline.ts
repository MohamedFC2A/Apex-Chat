/**
 * APEX Unbound Pipeline Orchestrator
 *
 * Master coordinator for the 6-phase multi-agent web generation system:
 *
 * ┌───────────────────────────────────────────────────────────┐
 * │               APEX UNBOUND PIPELINE                       │
 * │                                                           │
 * │  [1] Architect Agent    → SystemSpec JSON                 │
 * │           ↓                                               │
 * │  [2] HTML Agent         → Semantic DOM (HTML5)            │
 * │           ↓                                               │
 * │  [3] Selector Sync      → Global Selector Map (AST)       │
 * │           ↓                                               │
 * │  [4a] CSS Agent  ─────┐ (concurrent)                      │
 * │  [4b] JS Agent   ─────┘                                   │
 * │           ↓                                               │
 * │  [5] Bundler Engine     → Self-Contained HTML             │
 * └───────────────────────────────────────────────────────────┘
 */

import OpenAI from "openai";
import { runArchitectAgent, type SystemSpec } from "./architect-agent.js";
import { runHtmlAgent } from "./html-agent.js";
import { runSelectorSyncEngine, type GlobalSelectorMap } from "./selector-sync-engine.js";
import { runCssAgent } from "./css-agent.js";
import { runJsAgent } from "./js-agent.js";
import { runBundlerEngine, type BundleResult } from "./bundler-engine.js";

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────

export interface UnboundPipelineRequest {
  message: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
}

export interface UnboundPipelinePhase {
  phase: number;
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
  durationMs?: number;
}

export interface UnboundPipelineResult {
  bundledHtml: string;
  spec: SystemSpec;
  selectorMap: GlobalSelectorMap;
  bundle: BundleResult;
  phases: UnboundPipelinePhase[];
  totalDurationMs: number;
  formattedOutput: string; // The markdown-formatted content for the chat message
}

export type UnboundChunkCallback = (chunk: {
  content?: string;
  reasoningContent?: string;
  phase?: UnboundPipelinePhase;
}) => void;

// ──────────────────────────────────────────────────────────────
// Google Search via Serper.dev Helper
// ──────────────────────────────────────────────────────────────

async function runSerperSearch(query: string): Promise<{
  organic: Array<{ title: string; link: string; snippet: string }>;
  images: Array<{ title: string; imageUrl: string }>;
}> {
  const apiKey = process.env.SERPER_API_KEY || "0adc781c41f363a53ce1f72f199f494b9436bafd";
  const result = { organic: [] as any[], images: [] as any[] };

  try {
    console.log(`[APEX Unbound Search] Querying Serper.dev for: "${query}"...`);
    
    // Fetch text search
    const textRes = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (textRes.ok) {
      const data = await textRes.json();
      result.organic = (data.organic || []).map((item: any) => ({
        title: item.title || "",
        link: item.link || "",
        snippet: item.snippet || "",
      }));
    }

    // Fetch image search
    const imgRes = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (imgRes.ok) {
      const data = await imgRes.json();
      result.images = (data.images || []).map((item: any) => ({
        title: item.title || "",
        imageUrl: item.imageUrl || "",
      }));
    }
  } catch (err) {
    console.error("[APEX Unbound Search] Search request failed:", err);
  }

  return result;
}

// ──────────────────────────────────────────────────────────────
// Pipeline Executor
// ──────────────────────────────────────────────────────────────

export async function runUnboundPipeline(
  client: OpenAI,
  request: UnboundPipelineRequest,
  onChunk?: UnboundChunkCallback
): Promise<UnboundPipelineResult> {
  const pipelineStart = Date.now();

  // Use the flagship deepseek-v4-pro model for all agents to deliver the strongest coding performance
  const architectModel = "deepseek-v4-pro";
  const specialistModel = "deepseek-v4-pro";

  const phases: UnboundPipelinePhase[] = [
    { phase: 1, name: "Architect Agent — System Specification", status: "pending" },
    { phase: 2, name: "HTML Agent — Semantic DOM Generation", status: "pending" },
    { phase: 3, name: "Selector Sync Engine — Token Extraction", status: "pending" },
    { phase: 4, name: "CSS + JS Agents — Parallel Compilation", status: "pending" },
    { phase: 5, name: "Bundler Engine — Final Assembly", status: "pending" },
  ];

  const updatePhase = (phaseNum: number, updates: Partial<UnboundPipelinePhase>) => {
    const idx = phases.findIndex((p) => p.phase === phaseNum);
    if (idx !== -1) {
      phases[idx] = { ...phases[idx], ...updates };
      onChunk?.({ phase: phases[idx] });
    }
  };

  const emitStatus = (content: string) => {
    onChunk?.({ content });
  };

  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║     APEX UNBOUND PIPELINE STARTING       ║");
  console.log("╚══════════════════════════════════════════╝");

  // ── Run Serper Search ──────────────────────────────────────
  emitStatus("\n**[Phase 1/5] - Integrated Search**\nSearching Google for design patterns, assets, and images...\n\n");
  const searchResults = await runSerperSearch(request.message);
  
  let searchContext = "";
  if (searchResults.organic.length > 0) {
    searchContext += "\n=== REAL-TIME WEB SEARCH CONTEXT ===\n";
    searchResults.organic.slice(0, 5).forEach((item, idx) => {
      searchContext += `[Source ${idx + 1}] Title: ${item.title}\nSnippet: ${item.snippet}\nLink: ${item.link}\n\n`;
    });
  }
  
  if (searchResults.images.length > 0) {
    searchContext += "\n=== REAL TOPIC IMAGE LINKS ===\n";
    searchResults.images.slice(0, 6).forEach((img, idx) => {
      searchContext += `[Image ${idx + 1}] Title: ${img.title}\nURL: ${img.imageUrl}\n\n`;
    });
  }
  
  if (searchContext) {
    emitStatus(`> Found ${searchResults.organic.length} search references and ${searchResults.images.length} real images.\n\n`);
  }

  // ── Phase 1: Architect Agent ────────────────────────────────
  updatePhase(1, { status: "running" });
  emitStatus("\n**[Phase 1/5] - Architect Agent**\nAnalyzing requirements and generating system specification...\n\n");

  const phase1Start = Date.now();
  let spec: SystemSpec;
  try {
    spec = await runArchitectAgent(
      client,
      architectModel,
      `${request.message}\n\n${searchContext}`,
      request.conversationHistory || [],
      (msg) => emitStatus(`> ${msg}\n`)
    );
    updatePhase(1, { status: "done", durationMs: Date.now() - phase1Start, detail: `${spec.components.length} components planned` });
    emitStatus(`\n**Spec generated** - ${spec.components.length} components, ${spec.isRTL ? "RTL/Arabic" : "LTR"} layout\n`);
    emitStatus(`> Project: **${spec.projectTitle}**\n`);
    emitStatus(`> Colors: Primary ${spec.colorScheme.primary} · Accent ${spec.colorScheme.accent}\n`);
    emitStatus(`> Fonts: ${spec.typography.headingFont} / ${spec.typography.bodyFont}\n\n`);
  } catch (err: any) {
    updatePhase(1, { status: "error", detail: err.message });
    throw new Error(`[Phase 1] Architect Agent failed: ${err.message}`);
  }

  // ── Phase 2: HTML Agent ─────────────────────────────────────
  updatePhase(2, { status: "running" });
  emitStatus("**[Phase 2/5] - HTML Agent**\nConstructing semantic DOM structure...\n\n");

  const phase2Start = Date.now();
  let htmlCode: string;
  try {
    htmlCode = await runHtmlAgent(
      client,
      specialistModel,
      `${request.message}\n\n${searchContext}`,
      spec,
      (msg) => emitStatus(`> ${msg}\n`)
    );
    const elementCount = (htmlCode.match(/<[a-z]/gi) || []).length;
    updatePhase(2, { status: "done", durationMs: Date.now() - phase2Start, detail: `${elementCount} DOM elements` });
    emitStatus(`\n**HTML generated** - ${elementCount} elements, ${(htmlCode.length / 1024).toFixed(1)}KB\n\n`);
  } catch (err: any) {
    updatePhase(2, { status: "error", detail: err.message });
    throw new Error(`[Phase 2] HTML Agent failed: ${err.message}`);
  }

  // ── Phase 3: Selector Sync Engine ──────────────────────────
  updatePhase(3, { status: "running" });
  emitStatus("**[Phase 3/5] - Selector Sync Engine**\nExtracting DOM tokens and building Global Selector Map...\n\n");

  const phase3Start = Date.now();
  let selectorMap: GlobalSelectorMap;
  try {
    selectorMap = runSelectorSyncEngine(htmlCode);
    const phase3Duration = Date.now() - phase3Start;
    updatePhase(3, {
      status: "done",
      durationMs: phase3Duration,
      detail: `${selectorMap.ids.length} IDs, ${selectorMap.classes.length} classes, ${selectorMap.interactiveElements.length} interactive`,
    });
    emitStatus(`**Selector Map built** - ${selectorMap.ids.length} IDs, ${selectorMap.classes.length} classes, ${selectorMap.interactiveElements.length} interactive elements\n`);
    emitStatus(`> Token extraction: ${phase3Duration}ms\n`);
    emitStatus(`> All CSS/JS agents are now constrained to verified selectors only.\n\n`);
  } catch (err: any) {
    updatePhase(3, { status: "error", detail: err.message });
    throw new Error(`[Phase 3] Selector Sync Engine failed: ${err.message}`);
  }

  // ── Phase 4: CSS + JS Agents (Parallel) ────────────────────
  updatePhase(4, { status: "running" });
  emitStatus("**[Phase 4/5] - CSS and JS Agents (Parallel Execution)**\nGenerating styles and logic simultaneously...\n\n");

  const phase4Start = Date.now();
  let cssCode: string;
  let jsCode: string;

  try {
    // Run CSS and JS agents in parallel for speed
    const [cssResult, jsResult] = await Promise.all([
      runCssAgent(client, specialistModel, request.message, spec, selectorMap, (msg) =>
        emitStatus(`> ${msg}\n`)
      ),
      runJsAgent(client, specialistModel, request.message, spec, selectorMap, htmlCode, (msg) =>
        emitStatus(`> ${msg}\n`)
      ),
    ]);

    cssCode = cssResult;
    jsCode = jsResult;

    updatePhase(4, {
      status: "done",
      durationMs: Date.now() - phase4Start,
      detail: `CSS: ${(cssCode.length / 1024).toFixed(1)}KB · JS: ${(jsCode.length / 1024).toFixed(1)}KB`,
    });
    emitStatus(
      `\n**Parallel compilation complete** - CSS: ${(cssCode.length / 1024).toFixed(1)}KB, JS: ${(jsCode.length / 1024).toFixed(1)}KB\n\n`
    );
  } catch (err: any) {
    updatePhase(4, { status: "error", detail: err.message });
    throw new Error(`[Phase 4] CSS/JS Agents failed: ${err.message}`);
  }

  // ── Phase 5: Bundler Engine ─────────────────────────────────
  updatePhase(5, { status: "running" });
  emitStatus("**[Phase 5/5] - Bundler Engine**\nCompiling assets into self-contained HTML bundle...\n\n");

  const phase5Start = Date.now();
  let bundle: BundleResult;
  try {
    bundle = runBundlerEngine(htmlCode, cssCode, jsCode, spec, request.message);
    updatePhase(5, {
      status: "done",
      durationMs: Date.now() - phase5Start,
      detail: `${(bundle.stats.totalBytes / 1024).toFixed(1)}KB bundle`,
    });
    emitStatus(`**Bundle assembled** - ${(bundle.stats.totalBytes / 1024).toFixed(1)}KB total\n`);
    emitStatus(`> RTL: ${bundle.stats.hasRTL ? "Yes" : "No"} · Viewport: ${bundle.stats.hasViewportMeta ? "Yes" : "No"} · Google Fonts: ${bundle.stats.hasGoogleFonts ? "Yes" : "No"}\n\n`);
  } catch (err: any) {
    updatePhase(5, { status: "error", detail: err.message });
    throw new Error(`[Phase 5] Bundler Engine failed: ${err.message}`);
  }

  const totalDuration = Date.now() - pipelineStart;

  // ── Build formatted output message ─────────────────────────
  const completedPhasesSummary = phases
    .map(
      (p) =>
        `| ${p.phase} | ${p.name} | ${p.status === "done" ? "Success" : p.status === "error" ? "Failed" : "Pending"} | ${p.durationMs ? `${(p.durationMs / 1000).toFixed(1)}s` : "—"} | ${p.detail || "—"} |`
    )
    .join("\n");

  const formattedOutput = `
## APEX Unbound — Pipeline Complete

| Phase | Agent | Status | Duration | Details |
|-------|-------|--------|----------|---------|
${completedPhasesSummary}

**Total Duration:** ${(totalDuration / 1000).toFixed(1)}s
**Bundle Size:** ${(bundle.stats.totalBytes / 1024).toFixed(1)}KB

---

\`\`\`html
${htmlCode}
\`\`\`

\`\`\`css
${cssCode}
\`\`\`

\`\`\`javascript
${jsCode}
\`\`\`

---

### Architecture Notes

**Project:** ${spec.projectTitle}
**Components:** ${spec.components.map((c) => c.name).join(", ")}
**Selector Map:** ${selectorMap.ids.length} IDs · ${selectorMap.classes.length} classes · ${selectorMap.interactiveElements.length} interactive elements
**Color Palette:** ${spec.colorScheme.primary} (primary) · ${spec.colorScheme.accent} (accent)
**Typography:** ${spec.typography.headingFont} / ${spec.typography.bodyFont}
**Direction:** ${spec.isRTL ? "RTL (Arabic)" : "LTR (English)"}
`;

  console.log("\n╔══════════════════════════════════════════╗");
  console.log(`║  APEX UNBOUND COMPLETE: ${(totalDuration / 1000).toFixed(1)}s total`);
  console.log(`║  Bundle: ${(bundle.stats.totalBytes / 1024).toFixed(1)}KB`);
  console.log("╚══════════════════════════════════════════╝\n");

  return {
    bundledHtml: bundle.html,
    spec,
    selectorMap,
    bundle,
    phases,
    totalDurationMs: totalDuration,
    formattedOutput,
  };
}
