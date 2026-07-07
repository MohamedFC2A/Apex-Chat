/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  APEX AI — BACKWARD COMPATIBILITY WRAPPER FOR MARKDOWN TO PDF                ║
 * ║  Re-routes to server/pdf/index.ts module                                     ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

export {
  markdownToPdfDocument,
  conversationToPdfDocument,
} from "./pdf/index.js";
