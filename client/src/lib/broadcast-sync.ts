/**
 * BROADCAST SYNC
 * 
 * Synchronizes generation states across browser tabs to prevent multi-tab conflicts.
 */

type GenerationBroadcastMessage =
  | { type: 'GENERATION_STARTED'; tabId: string; generationId: string; conversationId: string }
  | { type: 'GENERATION_ENDED'; tabId: string; generationId: string }
  | { type: 'TAB_CLAIM_RESUME'; tabId: string; generationId: string };

const CHANNEL_NAME = 'apex-generation-sync';
const TAB_ID = crypto.randomUUID();

let channel: BroadcastChannel | null = null;

export function initBroadcastSync(
  onExternalGenerationStarted: (generationId: string, conversationId: string) => void,
  onExternalGenerationEnded: (generationId: string) => void,
): () => void {
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event: MessageEvent<GenerationBroadcastMessage>) => {
      const msg = event.data;
      if (msg.tabId === TAB_ID) return;

      switch (msg.type) {
        case 'GENERATION_STARTED':
          onExternalGenerationStarted(msg.generationId, msg.conversationId);
          break;
        case 'GENERATION_ENDED':
          onExternalGenerationEnded(msg.generationId);
          break;
        case 'TAB_CLAIM_RESUME':
          break;
      }
    };

    channel.postMessage({
      type: 'TAB_CLAIM_RESUME',
      tabId: TAB_ID,
      generationId: '',
    });

    return () => {
      channel?.close();
      channel = null;
    };
  } catch {
    return () => {};
  }
}

export function broadcastGenerationStarted(generationId: string, conversationId: string): void {
  try {
    channel?.postMessage({
      type: 'GENERATION_STARTED',
      tabId: TAB_ID,
      generationId,
      conversationId,
    });
  } catch (_) {}
}

export function broadcastGenerationEnded(generationId: string): void {
  try {
    channel?.postMessage({
      type: 'GENERATION_ENDED',
      tabId: TAB_ID,
      generationId,
    });
  } catch (_) {}
}
