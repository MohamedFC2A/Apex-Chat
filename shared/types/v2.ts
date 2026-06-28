/**
 * Apex Omni V2 — Shared Type Definitions
 * Client-accessible types that mirror server V2 architecture interfaces.
 */

/**
 * Category Vector Masking Array — returned by generateCognitiveMask()
 * Each flag controls whether its cognitive sub-agent block is activated.
 */
export interface AgentMaskConfiguration {
  researchFacts: boolean;
  codeImplementation: boolean;
  securityAnalysis: boolean;
  creativeSolutions: boolean;
}
