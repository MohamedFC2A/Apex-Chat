/**
 * APEX Unbound Client Service
 *
 * Connects to the /api/unbound SSE endpoint and manages the
 * streaming pipeline state on the client side.
 *
 * Provides a real-time phase tracker and content accumulator.
 */

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
}

export type UnboundStateCallback = (state: UnboundState) => void;

const INITIAL_PHASES: UnboundPhase[] = [
  { phase: 1, name: "Architect Agent — System Specification", status: "pending" },
  { phase: 2, name: "HTML Agent — Semantic DOM Generation", status: "pending" },
  { phase: 3, name: "Selector Sync Engine — Token Extraction", status: "pending" },
  { phase: 4, name: "CSS + JS Agents — Parallel Compilation", status: "pending" },
  { phase: 5, name: "Bundler Engine — Final Assembly", status: "pending" },
];

/**
 * Run the APEX Unbound pipeline via SSE streaming.
 * Returns the final accumulated content.
 */
export async function runUnboundService(
  message: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>,
  onStateChange: UnboundStateCallback,
  onContentChunk: (chunk: string, isReplace?: boolean) => void
): Promise<string> {
  const state: UnboundState = {
    isRunning: true,
    phases: INITIAL_PHASES.map((p) => ({ ...p })),
    content: "",
    error: null,
    currentPhase: 0,
  };

  const emit = () => onStateChange({ ...state, phases: [...state.phases] });

  emit();

  let accumulatedContent = "";

  try {
    // Try backend first
    const response = await fetch("/api/unbound", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationHistory }),
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
            emit();
          } else if (event.type === "final" && event.content) {
            accumulatedContent = event.content;
            state.content = accumulatedContent;
            onContentChunk(event.content, true);
            emit();
          } else if (event.type === "phase" && event.phase) {
            const phaseData: UnboundPhase = event.phase;
            const idx = state.phases.findIndex((p) => p.phase === phaseData.phase);
            if (idx !== -1) {
              state.phases[idx] = phaseData;
              state.currentPhase = phaseData.phase;
            }
            emit();
          } else if (event.type === "done") {
            state.isRunning = false;
            state.completedAt = Date.now();
            // Mark all phases as done if they're still pending (safety)
            state.phases = state.phases.map((p) =>
              p.status === "pending" ? { ...p, status: "done" } : p
            );
            emit();
          } else if (event.type === "error") {
            throw new Error(event.error || "Pipeline error");
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
  return accumulatedContent;
}
