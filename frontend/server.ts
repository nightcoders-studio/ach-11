import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API: Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API: Stream Text Generation via Gemini API
  app.post("/api/chat", async (req, res) => {
    const { prompt, systemPrompt, model, temperature, maxTokens } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });
      res.write(`data: ${JSON.stringify({ error: "GEMINI_API_KEY is missing. Please set your API key in the Settings > Secrets panel of your AI Studio Workspace." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    });

    try {
      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      // Default model mapping - map safely to gemini-3.5-flash to obey constraints
      let targetModel = "gemini-3.5-flash";

      // Include a subtle prompt wrapper to simulate Claude/GPT styles and personality
      let personaInstruction = systemPrompt ?? "Anda adalah asisten AI yang cerdas.";
      if (model && model.includes("gpt")) {
        personaInstruction += "\n[Simulate OpenAI GPT-4o personality: precise, structured, using elegant markdown lists and structured outlines.]";
      } else if (model && model.includes("claude")) {
        personaInstruction += "\n[Simulate Claude 3.5 Sonnet personality: highly articulate, deeply analytical, intellectual, and helpful.]";
      } else {
        personaInstruction += "\n[Simulate default Gemini balance: highly expressive, warm, developer-friendly and helpful.]";
      }

      const responseStream = await ai.models.generateContentStream({
        model: targetModel,
        contents: prompt,
        config: {
          systemInstruction: personaInstruction,
          temperature: parseFloat(temperature) || 0.7,
          maxOutputTokens: parseInt(maxTokens) || 2048,
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || "";
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Gemini stream error in server backend:", error);
      res.write(`data: ${JSON.stringify({ error: error.message || "Gagal menghubungi API AI server-side." })}\n\n`);
      res.write("data: [DONE]\n\n");
      res.end();
    }
  });

  // Vite Integration for Serving Assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`KedaiAI custom server is running cleanly on host 0.0.0.0 port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to boot up KedaiAI server:", err);
});
