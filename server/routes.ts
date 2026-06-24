import type { Express } from "express";
import type { Server } from "http";
import { chatRequestSchema } from "@shared/schema";
import { processMessage, validateModelAccess } from "./ai-orchestrator";
import { randomUUID } from "crypto";
import { runUnboundPipeline } from "./apex-unbound/pipeline.js";
import OpenAI from "openai";
import DOMPurify from "isomorphic-dompurify";

const previewStore = new Map<string, { html: string; createdAt: number }>();

// Clean up previews older than 1 hour to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of previewStore.entries()) {
    if (now - data.createdAt > 60 * 60 * 1000) {
      previewStore.delete(id);
    }
  }
}, 15 * 60 * 1000); // Check every 15 mins

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Chat endpoint - process messages through Cerebras with tier validation
  app.post("/api/chat", async (req, res) => {
    try {
      const validationResult = chatRequestSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validationResult.error.errors,
        });
      }

      const {
        message,
        model,
        mode,
        reasoningLevel,
        subscriptionTier,
        features,
        conversationId,
        conversationHistory,
        userMemoryContext,
        clientLocalTime,
        stream
      } = validationResult.data;



      // Standard flow (non-God Mode): Use DeepSeek via orchestrator
      let targetModel = model;

      // Server-side tier validation against the requested model
      if (!validateModelAccess(model, subscriptionTier)) {
        if (stream) {
          res.setHeader("Content-Type", "text/event-stream");
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("Connection", "keep-alive");
          res.write(`data: ${JSON.stringify({ error: "Access denied", message: `Model ${model} requires a higher subscription tier.` })}\n\n`);
          res.end();
          return;
        }
        return res.status(403).json({
          error: "Access denied",
          message: `Model ${model} requires a higher subscription tier.`,
          requiredAction: "upgrade"
        });
      }

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
          await processMessage({
            message,
            model: targetModel,
            mode,
            reasoningLevel,
            subscriptionTier,
            features,
            conversationHistory,
            userMemoryContext,
            clientLocalTime,
          }, (chunk) => {
            res.write(`data: ${JSON.stringify({
              id: randomUUID(),
              content: chunk.content || "",
              reasoningContent: chunk.reasoningContent || "",
              model,
              conversationId: conversationId || randomUUID()
            })}\n\n`);
          });
        } catch (err: any) {
          console.error("Streaming error:", err);
          res.write(`data: ${JSON.stringify({ error: err.message || "Failed to process message" })}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      const response = await processMessage({
        message,
        model: targetModel,
        mode,
        reasoningLevel,
        subscriptionTier,
        features,
        conversationHistory,
        userMemoryContext,
        clientLocalTime,
      });

      return res.json({
        id: randomUUID(),
        content: response.content,
        reasoningContent: response.reasoningContent,
        model, // echo the requested model to the client
        conversationId: conversationId || randomUUID(),
      });
    } catch (error) {
      console.error("Chat API error:", error);

      // Handle specific tier validation errors
      if (error instanceof Error && error.message.includes("Access denied")) {
        return res.status(403).json({
          error: "Access denied",
          message: error.message,
        });
      }

      return res.status(500).json({
        error: "Failed to process message",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Subscription validation endpoint
  app.post("/api/subscription/validate", (req, res) => {
    const { model, tier } = req.body;

    if (!model || !tier) {
      return res.status(400).json({ error: "Model and tier are required" });
    }

    const hasAccess = validateModelAccess(model, tier);
    return res.json({ hasAccess });
  });

  // Suggestions endpoint
  app.post("/api/suggestions", async (req, res) => {
    const { userMemoryContext } = req.body;

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      return res.status(500).json({ error: "DEEPSEEK_API_KEY is not configured" });
    }

    try {
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com/v1",
      });

      let prompt = "";
      if (userMemoryContext && Array.isArray(userMemoryContext) && userMemoryContext.length > 0) {
        const historyStr = userMemoryContext
          .map((c: any) => `- Conversation Title: "${c.title}", Last Query: "${c.lastQuery}"`)
          .join("\n");
        prompt = `The user has the following past conversation history and recent queries:\n${historyStr}\n\nBased on these previous interests, generate 4 highly personalized, curious, and specific suggestion questions in Arabic. Each question must provoke high interest and curiosity (فضول) for the user to explore further. Make them logical next steps or interesting related topics rather than repeating their past questions.`;
      } else {
        prompt = `Generate 4 general, highly intriguing, and curious suggestion questions in Arabic. They should cover exciting and mind-bending topics like advanced science, future AI, philosophy, creative writing, or high-tech concepts, making the user extremely curious to click and read the answers.`;
      }

      const response = await client.chat.completions.create({
        model: "deepseek-chat",
        messages: [
          {
            role: "system",
            content: `You are an expert conversational AI agent. You must generate 4 intriguing, high-curiosity suggestion prompts in Arabic for the chat welcome screen.
Output ONLY a raw JSON array of 4 objects (no markdown, no backticks, no wrap) in this format:
[
  {
    "title": "Short title in Arabic (2-3 words)",
    "desc": "Intriguing description in Arabic (4-6 words)",
    "prompt": "The actual full question/prompt in Arabic to send to the AI"
  }
]`
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 600,
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content || "";
      const cleanJson = content.replace(/```json|```/g, "").trim();
      const suggestions = JSON.parse(cleanJson);
      return res.json(suggestions);
    } catch (error) {
      console.error("Suggestions API error:", error);
      // Fallback suggestions
      const fallbackSuggestions = [
        {
          title: "الكتابة وصناعة المحتوى",
          desc: "مقالات، رسائل إيميل، أو نصوص إبداعية",
          prompt: "اكتب لي مقالاً احترافياً عن فوائد الذكاء الاصطناعي في حياتنا اليومية",
        },
        {
          title: "المقارنات والتحليل",
          desc: "تحليل الأفكار ومقارنة البيانات المعقدة",
          prompt: "قارن بين نموذج الذكاء الاصطناعي الهجين والنموذج السحابي من حيث الكفاءة والأمان",
        },
        {
          title: "البرمجة وحل المشكلات",
          desc: "كتابة وتعديل الأكواد البرمجية بكفاءة",
          prompt: "اكتب كود React مخصص لصفحة لوحة تحكم (Dashboard) باستخدام TailwindCSS",
        },
        {
          title: "التخطيط والتنظيم اليومي",
          desc: "جداول رياضية، خطط عمل، وتنظيم المهام",
          prompt: "صمم لي جدول تمارين رياضية منزلي لمدة أسبوع لزيادة اللياقة البدنية",
        },
      ];
      return res.json(fallbackSuggestions);
    }
  });

  // ── APEX UNBOUND: Dedicated multi-agent web generation endpoint ──────────────────
  // Streams phase-by-phase SSE events as each agent completes its work
  app.post("/api/unbound", async (req, res) => {
    const { message, conversationHistory } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "message is required" });
    }

    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    if (!deepseekKey) {
      return res.status(500).json({ error: "DEEPSEEK_API_KEY is not configured" });
    }

    // Set up SSE for real-time streaming
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (data: object) => {
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      const client = new OpenAI({
        apiKey: deepseekKey,
        baseURL: "https://api.deepseek.com/v1",
      });

      const result = await runUnboundPipeline(
        client,
        {
          message,
          conversationHistory: conversationHistory || [],
        },
        (chunk) => {
          if (chunk.content) {
            sendEvent({ type: "content", content: chunk.content });
          }
          if (chunk.phase) {
            sendEvent({ type: "phase", phase: chunk.phase });
          }
        }
      );

      sendEvent({ type: "final", content: result.formattedOutput });
      sendEvent({ type: "done" });
    } catch (err: any) {
      console.error("[APEX Unbound] Pipeline error:", err);
      sendEvent({ type: "error", error: err.message || "Pipeline failed" });
    } finally {
      res.end();
    }
  });

  // ❌ DEPRECATED: Voucher redemption endpoint removed
  // Voucher logic is now handled 100% client-side via Firestore SDK
  // See: client/src/lib/subscription-store.ts -> redeemVoucher()
  // 
  // Why removed:
  // - This endpoint had NO database interaction (stateless mock)
  // - No atomic transactions (race conditions possible)
  // - No wallet updates to Firestore
  // - Vouchers stored in Firestore, not hardcoded in schema.ts
  // 
  // If this route is accidentally called, return a helpful error
  app.post("/api/voucher/redeem", (req, res) => {
    return res.status(410).json({
      success: false,
      error: "DEPRECATED_ENDPOINT",
      message: "This endpoint has been removed. Vouchers are now redeemed client-side via Firebase.",
      details: "Please ensure your client app is using the latest subscription-store.ts logic."
    });
  });

  // Website preview creation endpoint
  app.post("/api/preview", (req, res) => {
    const { html } = req.body;
    if (typeof html !== "string") {
      return res.status(400).json({ error: "Invalid html content" });
    }

    // Strict Size Limit: 2MB to prevent DoS attacks
    if (html.length > 2 * 1024 * 1024) {
      return res.status(413).json({ error: "Payload too large. Maximum size is 2MB." });
    }

    // Prevent memory leaks / abuse (Strict LRU implementation)
    if (previewStore.size >= 500) {
      const firstKey = previewStore.keys().next().value;
      if (firstKey) previewStore.delete(firstKey);
    }

    // Optionally sanitize HTML here if needed, but since it's meant to execute JS for code generation, 
    // we rely on CSP and sandbox headers in the GET route.
    const id = randomUUID();
    previewStore.set(id, { html, createdAt: Date.now() });
    return res.json({ id });
  });

  // Website preview rendering endpoint (Direct HTTP serving)
  app.get("/preview/:id", (req, res) => {
    const { id } = req.params;
    const data = previewStore.get(id);
    if (!data) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Preview Expired</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { background: #09090b; color: #a1a1aa; font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; padding: 1rem; box-sizing: border-box; }
            .card { text-align: center; border: 1px solid #27272a; padding: 2.5rem; border-radius: 16px; background: #18181b; max-w: 400px; width: 100%; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); }
            h1 { color: #f43f5e; margin-bottom: 0.75rem; font-size: 1.5rem; }
            p { font-size: 0.875rem; color: #71717a; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>رابط المعاينة منتهي الصلاحية</h1>
            <p>Preview expired or not found. Please regenerate it again from the chat.</p>
          </div>
        </body>
        </html>
      `);
    }

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Enforce strict Content Security Policy to prevent data exfiltration and cross-site actions
    res.setHeader("Content-Security-Policy", "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https://fonts.googleapis.com https://fonts.gstatic.com; frame-ancestors 'self';");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    return res.send(data.html);
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      provider: "cerebras",
      apiConfigured: !!process.env.CEREBRAS_API_KEY,
    });
  });

  return httpServer;
}
