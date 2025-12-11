import type { Express } from "express";
import { createServer, type Server } from "http";
import { chatRequestSchema } from "@shared/schema";
import { processMessage } from "./ai-orchestrator";
import { randomUUID } from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Chat endpoint - process messages through AI orchestrator
  app.post("/api/chat", async (req, res) => {
    try {
      const validationResult = chatRequestSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({
          error: "Invalid request",
          details: validationResult.error.errors,
        });
      }

      const { message, model, mode, reasoningLevel, conversationId, conversationHistory } = validationResult.data;

      const response = await processMessage({
        message,
        model,
        mode,
        reasoningLevel,
        conversationHistory,
      });

      return res.json({
        id: randomUUID(),
        content: response.content,
        reasoningContent: response.reasoningContent,
        model,
        conversationId: conversationId || randomUUID(),
      });
    } catch (error) {
      console.error("Chat API error:", error);
      return res.status(500).json({
        error: "Failed to process message",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ 
      status: "ok",
      models: {
        openai: !!process.env.OPENAI_API_KEY,
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        gemini: !!process.env.GEMINI_API_KEY,
      }
    });
  });

  return httpServer;
}
