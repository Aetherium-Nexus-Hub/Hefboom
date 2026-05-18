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

  // Gemini API Initialization
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for AI analysis
  app.post("/api/analyze", async (req, res) => {
    try {
      const { metrics, loopsCount, bpm } = req.body;
      
      const prompt = `You are an AI Music Critic for a minimalist DAW called 'Elastic Momentum'. 
      The user just performed an interaction with the following data:
      - Input Tension: ${metrics.input}
      - Output Kinetic Energy: ${metrics.output}
      - Number of captured loops: ${loopsCount}
      - Current BPM: ${bpm}
      
      Provide a brief, poetic, one-sentence description of the 'vibe' or 'musical mood' of this performance. 
      Use technical but abstract musical terms (e.g., 'granular resonance', 'elastic syncopation', 'kinetic transients'). 
      Keep it under 15 words.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt
      });
      
      const text = response.text || "Oscillating transients in equilibrium.";
      
      res.json({ analysis: text.trim() });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: "Failed to analyze performance" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
