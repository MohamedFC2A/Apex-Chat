/**
 * Apex Coder Client Service
 *
 * Connects to the /api/unbound SSE endpoint and manages the
 * streaming pipeline state on the client side.
 *
 * Provides a real-time phase tracker and content accumulator.
 */
import { throttledSaveGenerationState } from "./generation-session";
export interface UnboundPhase {
  phase: number;
  name: string;
  status: "pending" | "running" | "done" | "error";
  detail?: string;
  durationMs?: number;
}

export interface UnboundState {
  isRunning: boolean;
  phases: UnboundPhase[];
  content: string;
  error: string | null;
  currentPhase: number;
  completedAt?: number;
  questions?: Array<{
    id: string;
    question: string;
    choices: Array<{ title: string; description: string; theme: string; config?: Record<string, any> }>
  }> | null;
  spec?: any | null;
  searchResults?: any | null;
  selectedChoices?: Array<{ questionId: string; title: string; description: string; theme: string; config?: Record<string, any> }> | null;
  workTree?: { root: any; edges: any[] } | null;
}

export type UnboundStateCallback = (state: UnboundState) => void;

const INITIAL_PHASES: UnboundPhase[] = [
  { phase: 1, name: "Requirements Architecture — Formal Specification", status: "pending" },
  { phase: 2, name: "Requirements Confirmation — Configuration Brief", status: "pending" },
  { phase: 3, name: "Markup Engineering — Semantic DOM", status: "pending" },
  { phase: 4, name: "Interface Contract — Selector Registry", status: "pending" },
  { phase: 5, name: "Presentation and Logic — Parallel Build", status: "pending" },
  { phase: 6, name: "Quality Review — Integration Audit", status: "pending" },
  { phase: 7, name: "Release Packaging — Single Bundle", status: "pending" },
];

export interface UnboundServiceResult {
  content: string;
  hasQuestion: boolean;
  questions?: Array<{
    id: string;
    question: string;
    choices: Array<{ title: string; description: string; theme: string; config?: Record<string, any> }>
  }>;
  spec?: any;
  searchResults?: any;
}

/**
 * Run the Apex Coder pipeline via SSE streaming.
 * Returns the final accumulated content or the questionnaire state.
 */
export async function runUnboundService(
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  onStateChange: UnboundStateCallback,
  onContentChunk: (chunk: string, isReplace?: boolean) => void,
  spec?: any | null,
  searchResults?: any | null,
  selectedChoices?: any | null,
  isFollowUp?: boolean,
  messageId?: string,
  conversationId?: string
): Promise<UnboundServiceResult> {
  const state: UnboundState = {
    isRunning: true,
    phases: INITIAL_PHASES.map((p) => {
      // If we are resuming (but not follow-up), mark Phase 1 and 2 as completed
      if (spec && !isFollowUp) {
        if (p.phase === 1) return { ...p, status: "done", detail: "System specification complete" };
        if (p.phase === 2) return { ...p, status: "done", detail: selectedChoices ? `Selected ${selectedChoices.length} styles` : "done" };
      }
      return { ...p };
    }),
    content: "",
    error: null,
    currentPhase: (spec && !isFollowUp) ? 2 : 0,
    questions: null,
    spec: spec || null,
    searchResults: searchResults || null,
    selectedChoices: selectedChoices || null,
  };

  const emit = () => onStateChange({ ...state, phases: [...state.phases] });

  emit();

  let accumulatedContent = "";

  try {
    const response = await fetch("/api/unbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationHistory,
        spec,
        searchResults,
        selectedChoices,
        isFollowUp,
        messageId,
        conversationId,
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Server returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw || raw === "[DONE]") continue;

        try {
          const event = JSON.parse(raw);

          if (event.type === "content" && event.content) {
            accumulatedContent += event.content;
            state.content = accumulatedContent;
            onContentChunk(event.content, false);
            if (conversationId && messageId) {
              throttledSaveGenerationState(conversationId, accumulatedContent, "", messageId);
            }
            emit();
          } else if (event.type === "final" && event.content) {
            accumulatedContent = event.content;
            state.content = accumulatedContent;
            onContentChunk(event.content, true);
            if (conversationId && messageId) {
              throttledSaveGenerationState(conversationId, accumulatedContent, "", messageId);
            }
            emit();
          } else if (event.type === "phase" && event.phase) {
            const phaseData: UnboundPhase = event.phase;
            const idx = state.phases.findIndex((p) => p.phase === phaseData.phase);
            if (idx !== -1) {
              state.phases[idx] = phaseData;
              state.currentPhase = phaseData.phase;
            }
            emit();
            state.selectedChoices = selectedChoices;
          } else if (event.type === "question") {
            state.questions = event.questions;
            state.spec = event.spec;
            state.searchResults = event.searchResults;
            state.isRunning = false;
            const idx = state.phases.findIndex((p) => p.phase === 2);
            if (idx !== -1) {
              state.phases[idx].status = "running";
              state.phases[idx].detail = "waiting for input";
              state.currentPhase = 2;
            }
            emit();
            
            // Clean close of connection
            reader.cancel();
            return {
              content: accumulatedContent,
              hasQuestion: true,
              questions: event.questions,
              spec: event.spec,
              searchResults: event.searchResults,
            };
          } else if (event.type === "done") {
            state.isRunning = false;
            state.completedAt = Date.now();
            state.phases = state.phases.map((p) =>
              p.status === "pending" ? { ...p, status: "done" } : p
            );
            emit();
          } else if (event.type === "error") {
            throw new Error(event.error || "Pipeline error");
          } else if (event.type === "workTree" && event.workTree) {
            state.workTree = event.workTree;
            emit();
          }
        } catch (parseErr) {
          // Ignore malformed SSE lines
        }
      }
    }
  } catch (err: any) {
    console.error("[Unbound Service] Error:", err);
    state.error = err.message || "Connection failed";
    state.isRunning = false;
    emit();
    throw err;
  }

  state.isRunning = false;
  emit();
  return {
    content: accumulatedContent,
    hasQuestion: false,
  };
}
