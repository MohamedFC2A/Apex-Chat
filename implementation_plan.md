# 🔱 APEX ENGINE SUPREMACY — Master Implementation Plan
### Apex Search v3 & Apex Omni v6 — Total Architectural Overhaul

> **Codename: OPERATION APEX ASCENSION**
> A two-front war on mediocrity. Every layer rebuilt. Every signal amplified. No compromises.

---

## Executive Summary

This plan describes the complete, fearless evolution of two already-advanced AI engines:

| Engine | Current State | Target State |
|---|---|---|
| **Apex Search** | DDG + Python scraper + semantic snippet extractor + image scorer | Federated multi-source search + real-time RAG pipeline + neural reranker + vision-aware image intelligence |
| **Apex Omni** | 10-agent pipeline + MCTS + ToT + GRPO + SFT prompting | Self-evolving 16-agent swarm + dynamic MCTS depth scaling + GoT graph executor + GRPO v2 with neural reward + streaming meta-cognition |

---

## Architectural Topology

```
╔══════════════════════════════════════════════════════════════════════════════════════════════╗
║                           APEX CHAT — UNIFIED INTELLIGENCE FABRIC                          ║
╠══════════════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                              ║
║   CLIENT LAYER (React / TypeScript)                                                         ║
║   ┌───────────────────┐   ┌─────────────────────┐   ┌──────────────────────────────┐       ║
║   │  Chat Interface   │   │  Search Results UI  │   │  Pipeline Telemetry Panel    │       ║
║   │  (SSE Streaming)  │   │  (Cards, Images,    │   │  (MCTS nodes, GRPO rewards,  │       ║
║   │                   │   │   Organic Results)  │   │   ToT branches, agent logs)  │       ║
║   └────────┬──────────┘   └──────────┬──────────┘   └──────────────┬───────────────┘       ║
║            │                         │                              │                        ║
║   ─────────┴─────────────────────────┴──────────────────────────────┴──────────────────    ║
║                                  HTTP / SSE Gateway                                         ║
║   ─────────────────────────────────────────────────────────────────────────────────────    ║
║                                                                                              ║
║   SERVER LAYER (Node.js / TypeScript)                                                       ║
║   ┌──────────────────────────────────────────────────────────────────────────────────┐      ║
║   │                         AI ORCHESTRATOR (routes.ts)                              │      ║
║   │   Intent Classifier → Model Router → Feature Gate → Rate Limiter → Dispatcher   │      ║
║   └──────┬───────────────────────────────────┬───────────────────────────────────────┘      ║
║          │                                   │                                               ║
║   ╔══════▼═══════════════╗         ╔══════════▼══════════════════════════════════════╗      ║
║   ║  APEX SEARCH v3      ║         ║  APEX OMNI v6                                   ║      ║
║   ║  (Search Engine)     ║         ║  (Reasoning Engine)                             ║      ║
║   ╠══════════════════════╣         ╠═════════════════════════════════════════════════╣      ║
║   ║                      ║         ║                                                  ║      ║
║   ║  ┌────────────────┐  ║         ║  ┌─────────────────────────────────────────┐   ║      ║
║   ║  │ Query Planner  │  ║         ║  │    STAGE 0: Query Intelligence Layer     │   ║      ║
║   ║  │ (Intent + Plan)│  ║         ║  │  SFT Classifier → Domain Router →       │   ║      ║
║   ║  └───────┬────────┘  ║         ║  │  Complexity Scorer → Profile Builder    │   ║      ║
║   ║          │           ║         ║  └────────────────────┬────────────────────┘   ║      ║
║   ║  ┌───────▼────────┐  ║         ║                        │                        ║      ║
║   ║  │ Federated       │  ║         ║  ┌─────────────────────▼────────────────────┐  ║      ║
║   ║  │ Search Layer    │  ║         ║  │    STAGE 1: Cognitive Architecture        │  ║      ║
║   ║  │ DDG + Serper +  │  ║         ║  │  ┌──────────┐  ┌──────────┐  ┌────────┐ │  ║      ║
║   ║  │ Brave + Google  │  ║         ║  │  │  MCTS v2 │  │  ToT/GoT │  │ GRPO   │ │  ║      ║
║   ║  └───────┬────────┘  ║         ║  │  │ (Dynamic │  │  Graph   │  │  v2    │ │  ║      ║
║   ║          │           ║         ║  │  │  Depth)  │  │ Executor │  │(Neural │ │  ║      ║
║   ║  ┌───────▼────────┐  ║         ║  │  └──────────┘  └──────────┘  │ Reward)│ │  ║      ║
║   ║  │ Neural Reranker │  ║         ║  │                               └────────┘ │  ║      ║
║   ║  │ (Cross-Encoder) │  ║         ║  └─────────────────────┬────────────────────┘  ║      ║
║   ║  └───────┬────────┘  ║         ║                          │                       ║      ║
║   ║          │           ║         ║  ┌───────────────────────▼──────────────────┐   ║      ║
║   ║  ┌───────▼────────┐  ║         ║  │    STAGE 2: 16-Agent Swarm Execution     │   ║      ║
║   ║  │ RAG Fusion     │  ║         ║  │                                           │   ║      ║
║   ║  │ Context Builder│  ║         ║  │  TIER A (Core, always active):            │   ║      ║
║   ║  │ + Snippet Fuser│  ║         ║  │  1. Analyst    2. Researcher  3. Critic   │   ║      ║
║   ║  └───────┬────────┘  ║         ║  │  4. ExpertWriter              5. Formatter│   ║      ║
║   ║          │           ║         ║  │                                           │   ║      ║
║   ║  ┌───────▼────────┐  ║         ║  │  TIER B (Domain-activated):               │   ║      ║
║   ║  │ Vision-Aware   │  ║         ║  │  6. CodeSpecialist  7. MathSpecialist     │   ║      ║
║   ║  │ Image Intel    │  ║         ║  │  8. FactChecker     9. LanguageAgent      │   ║      ║
║   ║  │ + CDN Optimizer│  ║         ║  │  10. QA Agent                             │   ║      ║
║   ║  └────────────────┘  ║         ║  │                                           │   ║      ║
║   ║                      ║         ║  │  TIER C (NEW — Power agents):             │   ║      ║
║   ╚══════════════════════╝         ║  │  11. Planner Agent  12. Debate Agent      │   ║      ║
║                                    ║  │  13. Synthesis Agent 14. Memory Agent     │   ║      ║
║                                    ║  │  15. Calibrator     16. Meta-QA Agent     │   ║      ║
║                                    ║  └─────────────────────┬────────────────────┘   ║      ║
║                                    ║                          │                        ║      ║
║                                    ║  ┌───────────────────────▼──────────────────┐   ║      ║
║                                    ║  │    STAGE 3: Response Synthesis & Stream   │   ║      ║
║                                    ║  │  Constraint Engine → Token Bias → Format  │   ║      ║
║                                    ║  │  → Streaming SSE chunks → Client          │   ║      ║
║                                    ║  └──────────────────────────────────────────┘   ║      ║
║                                    ╚═════════════════════════════════════════════════╝      ║
║                                                                                              ║
║   INFRASTRUCTURE LAYER                                                                      ║
║   ┌───────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐      ║
║   │  Redis Cache  │  │  Firestore   │  │  Python RAG  │  │  CDN Image Proxy        │      ║
║   │  (Search TTL) │  │  (History)   │  │  Microservice│  │  (weserv.nl / Cloudinary)│      ║
║   └───────────────┘  └──────────────┘  └──────────────┘  └─────────────────────────┘      ║
╚══════════════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Part I — APEX SEARCH v3 Complete Overhaul

### Current Architecture Weaknesses
- Single source: DuckDuckGo only (single point of failure)
- In-memory `Map` cache — evaporates on server restart
- Heuristic-only semantic snippet extraction (no embeddings)
- Image scoring is purely rule-based (no vision model)
- No result deduplication across multiple search calls
- No adaptive query expansion or query reformulation
- No structured extraction from scraped HTML (just regex strip)

### Target: Federated Neural Search Pipeline

---

#### Component 1.1 — Multi-Source Federated Search Layer

**New file:** `server/apex-search/federated-search.ts`

Implement a federated search broker that queries multiple engines in parallel and merges results using Reciprocal Rank Fusion (RRF):

```
Sources (in parallel):
  ├── DuckDuckGo        (free, bilingual, existing)
  ├── Brave Search API  (high quality, no tracking)
  ├── SerpAPI / Serper  (optional premium tier)
  └── Wikipedia API     (structured knowledge, always trusted)

Fusion Algorithm: Reciprocal Rank Fusion (RRF)
  score(d) = Σ  1 / (k + rank_i(d))    where k=60
             i∈sources
```

**Key improvements:**
- Fallback chain: if source i fails → continue with remaining
- Per-source timeout (2s hard cap) with `Promise.race` + abort signals
- Result deduplication by URL normalization (strip UTM params, trailing slashes)
- Language detection per result → bilingual boost for Arabic queries

---

#### Component 1.2 — Neural Reranker

**New file:** `server/apex-search/neural-reranker.ts`

Replace heuristic scoring with a true cross-encoder reranker using the LLM API:

```
For top-N candidates (N=15):
  Input: [query, snippet_i]  →  score_i ∈ [0,1]

Two modes:
  FAST: Heuristic BM25 + domain trust (current, keep as fallback)
  SMART: Batch LLM scoring via structured JSON output
         (group 5 results per call → 3 parallel calls)

Final ranking: 0.6 × neural_score + 0.4 × rrf_score
```

**Activation condition:** `options.deep === true || options.isOmni === true`

---

#### Component 1.3 — Structured HTML Extraction Engine

**New file:** `server/apex-search/content-extractor.ts`

Replace the current regex-strip scraper with a proper content extractor:

```
Extraction Pipeline per URL:
  1. Fetch HTML with browser-like headers + timeout
  2. BeautifulSoup-style parsing:
     - Extract <article>, <main>, [role="main"] first
     - Fallback to largest <div> by text density
  3. Remove: nav, footer, header, aside, script, style, ads
  4. Extract structured metadata:
     - <title>, <meta description>, <h1>, <time datetime>
     - Schema.org JSON-LD (Article, Product, Event, etc.)
  5. Sentence segmentation → scored paragraph pool
  6. Return top-K paragraphs ranked by query relevance
```

**Upgrade Python script** `server/ddg_search.py`:
- Add `readability-lxml` or `trafilatura` for clean article extraction
- Return `structured_data` field (JSON-LD parsed)
- Return `published_date` and `author` when available

---

#### Component 1.4 — RAG Fusion Context Builder

**Modify:** `server/apex-search-engine.ts` → `buildApexSearchContext()`

Implement true RAG Fusion: instead of concatenating top results, fuse them:

```
RAG Fusion Flow:
  1. Generate 3 query variants from the original query:
     - Original query
     - Rewritten (simpler, keyword-focused)
     - Expanded (added synonyms, bilingual terms)
  2. Run all 3 variants through federated search
  3. RRF-merge the 3 result lists
  4. For top-8 merged results, extract semantic snippets
  5. Build context: interleave snippets with source attribution
  6. Add structured data (JSON-LD) as bonus facts

Output format:
  [SOURCE 1: domain.com — title]
  Relevant excerpt...

  [SOURCE 2: ...]
  ...
  [STRUCTURED FACTS: from JSON-LD]
  ...
```

---

#### Component 1.5 — Vision-Aware Image Intelligence

**New file:** `server/apex-search/image-intelligence.ts`

Upgrade image scoring from heuristic rules to a smarter pipeline:

```
Image Intelligence Pipeline:
  1. Filter phase (keep current blocked/trusted domain rules)
  2. Quality assessment:
     - Resolution check (reject < 640×480)
     - Aspect ratio suitability per role
     - Format preference: AVIF > WebP > JPEG > PNG > SVG(reject)
  3. Relevance scoring:
     - Title/alt-text BM25 match against query terms
     - Domain authority boost (existing logic, improved weights)
  4. Perceptual dedup:
     - Hash-based: group images by URL path similarity
     - Reject near-duplicate images from same domain
  5. CDN proxy selection:
     - weserv.nl (current) for external images
     - Direct URL for Unsplash/Pexels (CDN-native)
     - Cloudinary transform for supported domains
```

**New image roles:**
- `"infographic"` — for technology/science queries
- `"map"` — for location/travel queries
- `"chart"` — for finance/statistics queries

---

#### Component 1.6 — Persistent Cache Layer

**New file:** `server/apex-search/search-cache.ts`

Replace in-memory `Map` with a proper cache adapter:

```typescript
interface SearchCacheAdapter {
  get(key: string): Promise<ApexSearchResponse | null>;
  set(key: string, value: ApexSearchResponse, ttlMs: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// Implementations:
class MemoryCacheAdapter     // current (fallback)
class FirestoreCacheAdapter  // for production (TTL via Firestore TTL policy)
class RedisCacheAdapter      // optional premium tier
```

**TTL strategy:**
- News/sports queries: 2 minutes
- Technology/science: 15 minutes
- General knowledge: 60 minutes
- Website design queries: 30 minutes

---

### Apex Search v3 — File Changeset

| File | Action | Description |
|---|---|---|
| `server/apex-search/federated-search.ts` | **NEW** | Multi-source RRF broker |
| `server/apex-search/neural-reranker.ts` | **NEW** | LLM cross-encoder reranker |
| `server/apex-search/content-extractor.ts` | **NEW** | Structured HTML extraction |
| `server/apex-search/image-intelligence.ts` | **NEW** | Vision-aware image scoring |
| `server/apex-search/search-cache.ts` | **NEW** | Persistent cache adapter |
| `server/apex-search/rag-fusion.ts` | **NEW** | Query variant + RAG fusion |
| `server/apex-search-engine.ts` | **MODIFY** | Orchestrate new components |
| `server/ddg_search.py` | **MODIFY** | Add trafilatura + JSON-LD |

---

## Part II — APEX OMNI v6 Complete Overhaul

### Current Architecture Weaknesses
- 10 agents all using same model (no specialization by capability)
- `classifyQuery()` uses simple regex (fragile, no semantic understanding)
- MCTS depth is fixed per complexity tier (not adaptive mid-search)
- GRPO generates outputs sequentially disguised as parallel (Promise.all but single model)
- No agent memory across turns (each call starts blank)
- ToT beam search has no branch pruning budget
- No meta-cognition (model doesn't know when it's wrong)
- `callAgent()` has no retry logic or circuit breaker

### Target: Self-Evolving 16-Agent Cognitive Swarm

---

#### Component 2.1 — Intelligent Query Intelligence Layer

**Modify:** `server/apex-omni/sft-prompt-builder.ts`

Upgrade `analyzeQuery()` from regex-based to a true semantic classifier:

```
Current:  regex pattern matching → domain label
New:      3-phase classification pipeline

Phase 1: Lexical (keep existing regex as fast-path for obvious cases)
Phase 2: Semantic scoring using embedding similarity against domain centroids
Phase 3: Intent graph — detect compound intents
         e.g., "explain and compare X vs Y with code examples"
         → { domains: ["reasoning","coding","analysis"], intents: ["explain","compare","generate"] }

Output: QueryProfile v2
{
  domains: string[]         // ordered by confidence
  intents: Intent[]         // multi-intent decomposition
  complexity: number        // 0-10 continuous
  language: LanguageProfile // ar/en/mixed + RTL flag + dialect
  estimatedTokenCost: number // predicted output size
  agentBudget: number       // max agents to activate (cost control)
  requiresSearch: boolean   // trigger Apex Search integration
  requiresReasoning: boolean // trigger MCTS/ToT
}
```

---

#### Component 2.2 — MCTS v2 — Dynamic Depth Scaling

**Modify:** `server/apex-omni/mcts-planner.ts`

Current MCTS uses fixed iteration counts (2/4/6 by complexity tier).
Upgrade to **adaptive depth scaling with early termination**:

```
MCTS v2 Algorithm:
  1. Start with iterations = complexity * 0.8 (continuous, not tiered)
  2. After each iteration, compute convergence score:
     Δ = |bestNode.score - prevBestScore|
  3. If Δ < ε for 2 consecutive iterations → EARLY STOP (saved compute)
  4. If Δ > threshold for 3 iterations → EXPAND budget (+2 more iterations)
  5. UCB1 formula upgraded:
     UCB1 = Q(s,a)/N(s,a) + C × √(2 × ln N(s) / N(s,a)) + diversity_bonus
     where diversity_bonus = semantic_distance(node, siblings)

New MCTSConfig fields:
  convergenceThreshold: number  // default 0.03
  maxBudgetExpansions: number   // default 2
  diversityWeight: number       // default 0.15
  enableEarlyStop: boolean      // default true
```

**New: MCTS Visualization Output** (for telemetry panel):
```typescript
mctsTree: {
  nodes: MCTSNode[]
  edges: { from: string; to: string; weight: number }[]
  bestPath: string[]  // node IDs from root to best leaf
}
```

---

#### Component 2.3 — Tree of Thoughts / Graph of Thoughts v2

**Modify:** `server/apex-omni/tot-engine.ts`

Upgrade branch generation from 3 fixed types to **adaptive branch taxonomy**:

```
Current branches: Analytical | Creative | Critical
New branches (domain-adaptive):
  REASONING domain:  Deductive | Inductive | Abductive | Analogical
  CODING domain:     Algorithm | DataStructure | Optimization | Security
  ANALYSIS domain:   Systemic | Comparative | Causal | Predictive
  CREATIVE domain:   Narrative | Poetic | Experimental | Hybrid
  GENERAL:           Analytical | Creative | Critical (keep current)

GoT Upgrade — True Graph Operations:
  MERGE(A, B) → synthesize two branches
  REFINE(A)   → deepen a promising branch
  PRUNE(A)    → kill a low-scoring branch
  FORK(A)     → split a branch into two sub-branches

Budget control:
  maxGraphOps = complexity * 2  (was fixed beamWidth)
  Each op costs 1 budget point
```

---

#### Component 2.4 — GRPO v2 — Neural Reward Model

**Modify:** `server/apex-omni/grpo-scorer.ts`

Current GRPO uses heuristic reward function. Upgrade to **neural reward model**:

```
GRPO v2 Reward Pipeline:
  FAST path (complexity ≤ 5):
    Keep existing heuristic scorer:
    reward = w1×relevance + w2×structure + w3×completeness + w4×clarity

  SMART path (complexity > 5):
    Reward model = LLM call with structured scoring prompt:
    Input: { query, candidate_response }
    Output: {
      relevance:    0-10,
      accuracy:     0-10,
      reasoning:    0-10,
      format:       0-10,
      completeness: 0-10,
      confidence:   0-1
    }
    Final reward = weighted_sum / 10

GRPO v2 Advantage Computation:
  Current: A_i = (r_i - mean(r)) / std(r)
  New:     A_i = (r_i - mean(r)) / (std(r) + ε) × confidence_i
  where ε = 1e-8 (numerical stability)
  and confidence_i = from neural reward model

Selection: instead of argmax(advantage), use:
  temperature-scaled softmax sampling over advantages
  → prevents always picking the same style output
```

---

#### Component 2.5 — 16-Agent Swarm Architecture

**Modify:** `server/apex-omni/pipeline.ts`

Add 6 new **Tier C Power Agents** to the existing 10:

```
TIER C — NEW AGENTS:

Agent 11: PLANNER AGENT
  Role: Decompose complex queries into a structured execution DAG
  Activation: complexity ≥ 7 || multi-intent query
  Output: ExecutionPlan { steps: Step[], dependencies: DAG }
  Model: deepseek-reasoner (or gemini-2.5-pro via OpenRouter)

Agent 12: DEBATE AGENT
  Role: Generate the strongest counter-argument to the ExpertWriter's response
  Activation: needsFactCheck || analysis domain
  Output: DebateResult { counterPoints: string[], score: number }
  Effect: Forces ExpertWriter to address counter-points in revision

Agent 13: SYNTHESIS AGENT
  Role: Merge outputs from Expert Writer + Debate Agent into balanced answer
  Activation: Always when Agent 12 is active
  Output: Synthesized balanced response

Agent 14: MEMORY AGENT
  Role: Extract and inject relevant conversation memory
  Activation: conversationHistory.length > 3
  Behavior:
    - Extract key facts from conversation history
    - Build a "working memory" context block
    - Inject into all other agent prompts
  Persistence: In-context (no external DB needed)

Agent 15: CALIBRATOR AGENT
  Role: Self-calibrate confidence levels on all factual claims
  Activation: needsFactCheck || domain === "research"
  Output: Annotated response with [HIGH/MED/LOW confidence] tags

Agent 16: META-QA AGENT
  Role: Final metacognitive review — does the response actually answer the question?
  Activation: Always (replaces current QA Agent 10 for complex queries)
  Checks:
    - Does response address all user intents?
    - Are there contradictions between sections?
    - Is the language/format correct for the user?
    - Confidence score ≥ threshold?
  Output: Pass | Revise(reason) | Regenerate(reason)
```

**Agent Orchestration Model:**
```
SIMPLE queries  → Agents: 1, 4, 8, 16
MODERATE queries → Agents: 1, 2, 4, 7, 8, 9, 16
COMPLEX queries → All 16 agents:
  Phase 1 (parallel): 1, 2, 3, 11, 14
  Phase 2 (parallel): 4, 5, 6, 7, 9, 12
  Phase 3 (sequential): 13 → 15 → 8 → 16
```

---

#### Component 2.6 — Agent Model Specialization Matrix

**Modify:** `getAgentModel()` in `server/apex-omni/pipeline.ts`

Stop using the same model for all 16 agents. Assign optimal models per agent role:

```typescript
const AGENT_MODEL_MATRIX = {
  // Reasoning-heavy agents → use the most powerful reasoner
  "1-Analyst":      "deepseek/deepseek-r1",       // Best for analysis
  "11-Planner":     "deepseek/deepseek-r1",       // Best for planning
  "16-MetaQA":      "deepseek/deepseek-r1",       // Best for metacognition

  // Writing-heavy agents → use the most fluent writer
  "4-ExpertWriter": "google/gemini-2.5-pro",      // Best long-form writing
  "13-Synthesis":   "google/gemini-2.5-pro",      // Best for fusion writing

  // Fast utility agents → use flash model for speed+cost
  "2-Researcher":   "google/gemini-2.5-flash",
  "3-Critic":       "google/gemini-2.5-flash",
  "8-Formatter":    "google/gemini-2.5-flash",
  "9-Language":     "google/gemini-2.5-flash",
  "12-Debate":      "google/gemini-2.5-flash",
  "14-Memory":      "google/gemini-2.5-flash",

  // Specialist agents → use domain-optimal models
  "5-CodeSpecialist": "deepseek/deepseek-coder",  // Best for code
  "6-MathSpecialist": "deepseek/deepseek-r1",     // Best for math
  "7-FactChecker":    "google/gemini-2.5-flash",
  "15-Calibrator":    "google/gemini-2.5-flash",
  "10-QA":            "google/gemini-2.5-flash",
}
```

---

#### Component 2.7 — Resilient Agent Execution Layer

**Modify:** `callAgent()` in `server/apex-omni/pipeline.ts`

Add production-grade resilience:

```typescript
async function callAgentResilient(
  config: AgentCallConfig
): Promise<AgentResult> {
  // Circuit breaker: if model X fails 3 times → switch to fallback
  // Retry with exponential backoff (1s, 2s, 4s)
  // Timeout: per-agent configurable (fast agents: 8s, complex: 25s)
  // Fallback model chain: primary → secondary → emergency
  // Telemetry: emit latency, token count, retry count
}

interface AgentResult {
  content: string
  latencyMs: number
  tokensUsed: number
  modelUsed: string       // actual model after fallback
  retries: number
  confidence?: number     // from neural reward if available
}
```

---

#### Component 2.8 — Apex Search × Omni Deep Integration

**Modify:** `server/apex-omni/pipeline.ts` + `server/apex-search-engine.ts`

When Apex Omni detects `requiresSearch: true`, it should NOT just prepend a search context block. It should perform **deep search-grounded reasoning**:

```
Search-Augmented Omni Flow:
  1. Analyst Agent produces initial plan
  2. If plan.requiresSearch:
     a. Extract 3 focused sub-queries from plan
     b. Run Apex Search v3 on each sub-query (parallel)
     c. Neural reranker merges all results
     d. Build RAG context block
  3. Inject RAG context into:
     - Researcher Agent prompt
     - FactChecker Agent prompt
     - Calibrator Agent prompt (new)
  4. ExpertWriter uses search-grounded context
  5. Calibrator cross-references claims against sources
  6. Citations extracted from sources → appended to response
```

---

#### Component 2.9 — Streaming Meta-Cognition Panel

**New file:** `server/apex-omni/telemetry-emitter.ts`

Emit real-time pipeline telemetry as SSE events to the client:

```typescript
interface PipelineTelemetryEvent {
  type: "agent_start" | "agent_done" | "mcts_iteration" | "tot_branch"
        | "grpo_sample" | "stage_complete" | "final_start"
  payload: {
    agentName?: string
    model?: string
    latencyMs?: number
    score?: number
    iteration?: number
    branch?: string
    stage?: number
  }
}
```

Client receives these events and renders a **live pipeline status panel** showing which agents are running, MCTS iteration count, ToT branches, GRPO reward scores — in real time.

---

### Apex Omni v6 — File Changeset

| File | Action | Description |
|---|---|---|
| `server/apex-omni/pipeline.ts` | **MODIFY** | 16-agent swarm, phase orchestration |
| `server/apex-omni/mcts-planner.ts` | **MODIFY** | Adaptive depth, convergence, diversity |
| `server/apex-omni/tot-engine.ts` | **MODIFY** | Domain-adaptive branches, graph ops |
| `server/apex-omni/grpo-scorer.ts` | **MODIFY** | Neural reward model, confidence-weighted |
| `server/apex-omni/sft-prompt-builder.ts` | **MODIFY** | Semantic classifier, multi-intent |
| `server/apex-omni/agents/` | **NEW DIR** | Individual agent modules (1 file per agent) |
| `server/apex-omni/telemetry-emitter.ts` | **NEW** | Real-time SSE pipeline telemetry |
| `server/apex-omni/agent-resilience.ts` | **NEW** | Circuit breaker + retry + fallback |
| `server/apex-omni/memory-agent.ts` | **NEW** | In-context conversation memory |
| `server/apex-omni/debate-synthesis.ts` | **NEW** | Debate + Synthesis agent logic |
| `server/apex-omni/meta-qa.ts` | **NEW** | Metacognitive QA + confidence scoring |

---

## Part III — Cross-Cutting Improvements

### 3.1 — Unified Error Taxonomy

**New file:** `server/shared/apex-errors.ts`

```typescript
enum ApexErrorCode {
  SEARCH_ALL_SOURCES_FAILED = "SEARCH_001",
  SEARCH_RATE_LIMITED       = "SEARCH_002",
  OMNI_AGENT_TIMEOUT        = "OMNI_001",
  OMNI_MODEL_UNAVAILABLE    = "OMNI_002",
  OMNI_GRPO_DEGENERATE      = "OMNI_003",  // all samples identical
  MCTS_NO_CONVERGENCE       = "OMNI_004",
  PIPELINE_BUDGET_EXCEEDED  = "OMNI_005",
}
```

### 3.2 — Observability & Logging

Every pipeline stage emits structured logs:
```
[APEX-SEARCH] {"stage":"rerank","latency":142,"source":"DDG","candidates":15,"selected":8}
[APEX-OMNI]  {"stage":"mcts","iteration":3,"nodes":12,"bestScore":0.87,"delta":0.02}
[APEX-OMNI]  {"agent":"4-ExpertWriter","model":"gemini-2.5-pro","tokens":1243,"latency":2840}
```

### 3.3 — Cost Governor

**New file:** `server/shared/cost-governor.ts`

Dynamically scale agent count and model tier based on:
- Subscription tier (free vs. pro vs. enterprise)
- Current API spend rate (rolling 1-hour window)
- Query estimated complexity and cost
- User-configurable quality vs. speed preference

```
FREE tier:    Max 5 agents, fast models only, no neural reranker
PRO tier:     Max 10 agents, mixed models, smart reranker
ENTERPRISE:   All 16 agents, best models, full pipeline
```

---

## Part IV — Client-Side Upgrades

### 4.1 — Pipeline Telemetry Panel

**New component:** `client/src/components/PipelineTelemetry.tsx`

A real-time panel showing:
- Agent execution timeline (Gantt-style)
- MCTS tree visualization (D3.js force graph)
- GRPO reward distribution (mini bar chart)
- ToT branch scores (horizontal bar)
- Search sources used + result count
- Total pipeline latency breakdown

### 4.2 — Enhanced Search Results Card

**Modify:** `client/src/components/` (search result components)

- Confidence badges on each result
- Source credibility score indicator
- "Why this result?" expandable explanation
- Image gallery with role labels (hero/showcase/gallery)
- Structured data display (JSON-LD facts as info cards)

---

## Execution Phases

| Phase | Scope | Duration | Priority |
|---|---|---|---|
| **Phase 1** | Apex Search: Federated Search + RRF fusion | Week 1 | 🔴 Critical |
| **Phase 2** | Apex Search: Neural Reranker + Content Extractor | Week 1-2 | 🔴 Critical |
| **Phase 3** | Apex Search: Image Intelligence + Persistent Cache | Week 2 | 🟠 High |
| **Phase 4** | Apex Omni: 16-Agent Swarm + Model Matrix | Week 2-3 | 🔴 Critical |
| **Phase 5** | Apex Omni: MCTS v2 + ToT v2 + GRPO v2 | Week 3 | 🔴 Critical |
| **Phase 6** | Apex Omni: Memory + Debate + Meta-QA Agents | Week 3-4 | 🟠 High |
| **Phase 7** | Search × Omni Deep Integration | Week 4 | 🟠 High |
| **Phase 8** | Telemetry Emitter + Client Panel | Week 4-5 | 🟡 Medium |
| **Phase 9** | Cost Governor + Error Taxonomy | Week 5 | 🟡 Medium |
| **Phase 10** | Load testing, benchmark evaluation, hardening | Week 5-6 | 🔴 Critical |

---

## Verification Plan

### Automated Tests

```bash
# Search Engine Tests
npx vitest run server/apex-search/__tests__/federated-search.test.ts
npx vitest run server/apex-search/__tests__/neural-reranker.test.ts
npx vitest run server/apex-search/__tests__/image-intelligence.test.ts

# Omni Pipeline Tests
npx vitest run server/apex-omni/__tests__/pipeline.test.ts
npx vitest run server/apex-omni/__tests__/mcts-planner.test.ts
npx vitest run server/apex-omni/__tests__/grpo-scorer.test.ts

# Integration Tests
npx vitest run server/__tests__/search-omni-integration.test.ts

# End-to-End
npx playwright test tests/search-flow.spec.ts
npx playwright test tests/omni-pipeline.spec.ts
```

### Benchmark Metrics

| Metric | Current | Target |
|---|---|---|
| Search result relevance (MRR@10) | ~0.55 | ≥ 0.80 |
| Search P95 latency | ~4.2s | ≤ 3.0s |
| Image quality acceptance rate | ~60% | ≥ 85% |
| Omni response quality (ROUGE-L) | baseline | +25% |
| Omni P95 latency (complex) | ~18s | ≤ 12s |
| Agent success rate | ~88% | ≥ 99% |
| MCTS convergence rate | N/A | ≥ 90% |
| GRPO advantage std (diversity) | N/A | ≥ 0.15 |

### Manual Verification
1. Test 20 Arabic + 20 English queries across all search domains
2. Test Omni pipeline with 10 complex multi-intent queries
3. Verify MCTS telemetry renders correctly in client panel
4. Verify image roles are correctly assigned per domain
5. Test fallback behavior: kill DDG → verify Brave takes over
6. Test circuit breaker: force model failure → verify fallback model activates
7. Test cost governor: verify FREE tier cannot activate Tier C agents

---

> **Ready to execute Phase 1?** Approve this plan and I'll begin immediately with the Federated Search Layer.
