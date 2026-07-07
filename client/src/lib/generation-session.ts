/**
 * GENERATION SESSION MANAGER
 * 
 * Manages transient generation states in sessionStorage to persist across page refreshes.
 * Implements a hybrid storage adapter for zustand/persist.
 */

const TRANSIENT_KEYS = [
  'activeGenerationId',
  'isGenerating',
  'streamingContentMap',
  'streamingReasoningMap',
  'activeQuizProgress',
  'activePdfProgress',
] as const;

export interface SessionState {
  activeGenerationId: string | null;
  isGenerating: boolean;
  streamingContent: Record<string, string>;
  streamingReasoning: Record<string, string>;
  savedAt: number;
}

export const hybridStorage = {
  getItem: (name: string): string | null => {
    try {
      const localRaw = localStorage.getItem(name);
      const sessionRaw = sessionStorage.getItem(name);

      const localState = localRaw ? JSON.parse(localRaw) : {};
      const sessionState = sessionRaw ? JSON.parse(sessionRaw) : {};

      // sessionStorage values take precedence over localStorage values
      return JSON.stringify({ ...localState, ...sessionState });
    } catch (error) {
      console.error('[HybridStorage] getItem failed:', error);
      return null;
    }
  },

  setItem: (name: string, value: string): void => {
    try {
      const fullState = JSON.parse(value);
      const localState: Record<string, unknown> = {};
      const sessionState: Record<string, unknown> = {};

      for (const [key, val] of Object.entries(fullState)) {
        if (TRANSIENT_KEYS.includes(key as any)) {
          sessionState[key] = val;
        } else {
          localState[key] = val;
        }
      }

      localStorage.setItem(name, JSON.stringify(localState));
      sessionStorage.setItem(name, JSON.stringify(sessionState));
    } catch (error) {
      console.error('[HybridStorage] setItem failed:', error);
    }
  },

  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name);
      sessionStorage.removeItem(name);
    } catch (error) {
      console.error('[HybridStorage] removeItem failed:', error);
    }
  },
};

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export function throttledSaveGenerationState(
  convId: string,
  content: string,
  reasoning: string,
  generationId: string,
): void {
  if (saveTimer) return;

  saveTimer = setTimeout(() => {
    try {
      const sessionData: SessionState = {
        activeGenerationId: generationId,
        isGenerating: true,
        streamingContent: { [convId]: content },
        streamingReasoning: { [convId]: reasoning },
        savedAt: Date.now(),
      };
      sessionStorage.setItem('apexchat-generation-live', JSON.stringify(sessionData));
    } catch (error) {
      console.warn('[GenerationSession] Failed to save live state:', error);
    } finally {
      saveTimer = null;
    }
  }, 500);
}

export function clearGenerationState(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  try {
    sessionStorage.removeItem('apexchat-generation-live');
  } catch (_) {}
}

export function getSavedGenerationState(): SessionState | null {
  try {
    const raw = sessionStorage.getItem('apexchat-generation-live');
    if (!raw) return null;

    const parsed: SessionState = JSON.parse(raw);

    // Ignore states older than 30 minutes
    if (Date.now() - parsed.savedAt > 30 * 60 * 1000) {
      sessionStorage.removeItem('apexchat-generation-live');
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}
