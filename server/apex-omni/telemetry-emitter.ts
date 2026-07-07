/**
 * Apex Omni v6 — Real-Time Pipeline Telemetry Emitter
 *
 * Emits structured SSE events for live pipeline visualization:
 * - Agent start/done events with latency and model info
 * - MCTS iteration tracking
 * - ToT branch scoring
 * - GRPO reward distribution
 * - Stage completion markers
 */

export type TelemetryEventType =
  | "agent_start"
  | "agent_done"
  | "mcts_iteration"
  | "tot_branch"
  | "grpo_sample"
  | "stage_complete"
  | "final_start"
  | "pipeline_start"
  | "pipeline_done"
  | "search_start"
  | "search_done";

export interface TelemetryPayload {
  agentName?: string;
  model?: string;
  latencyMs?: number;
  tokensUsed?: number;
  score?: number;
  reward?: number;
  iteration?: number;
  branch?: string;
  stage?: number;
  stageName?: string;
  resultCount?: number;
  source?: string;
  errorMessage?: string;
}

export interface PipelineTelemetryEvent {
  type: TelemetryEventType;
  payload: TelemetryPayload;
  timestamp: number;
  pipelineId?: string;
}

// ── Telemetry Buffer ───────────────────────────────────────────────────────────

const telemetryCallbacks = new Map<string, (event: PipelineTelemetryEvent) => void>();

export function registerTelemetryListener(
  pipelineId: string,
  callback: (event: PipelineTelemetryEvent) => void
): () => void {
  telemetryCallbacks.set(pipelineId, callback);
  return () => telemetryCallbacks.delete(pipelineId);
}

export function unregisterTelemetryListener(pipelineId: string): void {
  telemetryCallbacks.delete(pipelineId);
}

// ── Emit ───────────────────────────────────────────────────────────────────────

export function emitTelemetry(
  pipelineId: string,
  type: TelemetryEventType,
  payload: TelemetryPayload = {}
): void {
  const event: PipelineTelemetryEvent = {
    type,
    payload,
    timestamp: Date.now(),
    pipelineId,
  };

  // Call registered listener if exists
  const callback = telemetryCallbacks.get(pipelineId);
  if (callback) {
    try {
      callback(event);
    } catch {}
  }

  // Structured log for server observability
  const payloadStr = [
    payload.agentName ? `agent=${payload.agentName}` : "",
    payload.model ? `model=${payload.model}` : "",
    payload.latencyMs != null ? `latency=${payload.latencyMs}ms` : "",
    payload.tokensUsed != null ? `tokens=${payload.tokensUsed}` : "",
    payload.score != null ? `score=${payload.score?.toFixed(3)}` : "",
    payload.stage != null ? `stage=${payload.stage}` : "",
    payload.resultCount != null ? `results=${payload.resultCount}` : "",
  ].filter(Boolean).join(" ");

  console.log(`[Telemetry:${pipelineId?.slice(0, 8)}] ${type} ${payloadStr}`);
}

// ── SSE Serialization ──────────────────────────────────────────────────────────

export function telemetryToSSE(event: PipelineTelemetryEvent): string {
  return `data: ${JSON.stringify({ _telemetry: event })}\n\n`;
}

// ── Pipeline ID Generator ──────────────────────────────────────────────────────

export function generatePipelineId(): string {
  return `pipe_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// ── Convenience Wrappers ───────────────────────────────────────────────────────

export const Telemetry = {
  pipelineStart(id: string, queryLength: number): void {
    emitTelemetry(id, "pipeline_start", { stageName: "initialization" });
  },

  pipelineDone(id: string, totalMs: number): void {
    emitTelemetry(id, "pipeline_done", { latencyMs: totalMs, stageName: "complete" });
  },

  agentStart(id: string, agentName: string, model: string): void {
    emitTelemetry(id, "agent_start", { agentName, model });
  },

  agentDone(id: string, agentName: string, model: string, latencyMs: number, tokensUsed?: number): void {
    emitTelemetry(id, "agent_done", { agentName, model, latencyMs, tokensUsed });
  },

  stageComplete(id: string, stage: number, stageName: string): void {
    emitTelemetry(id, "stage_complete", { stage, stageName });
  },

  mctsIteration(id: string, iteration: number, score: number): void {
    emitTelemetry(id, "mcts_iteration", { iteration, score });
  },

  totBranch(id: string, branch: string, score: number): void {
    emitTelemetry(id, "tot_branch", { branch, score });
  },

  grpoSample(id: string, reward: number): void {
    emitTelemetry(id, "grpo_sample", { reward });
  },

  searchStart(id: string, source: string): void {
    emitTelemetry(id, "search_start", { source, stageName: "search" });
  },

  searchDone(id: string, source: string, resultCount: number, latencyMs: number): void {
    emitTelemetry(id, "search_done", { source, resultCount, latencyMs });
  },
};
