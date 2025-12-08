import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import OpenAI from "openai";
import * as fs from "fs";
import * as path from "path";

const upload = multer({ 
  dest: "/tmp/audio-uploads/",
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Transcription endpoint
  app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        console.error("OPENAI_API_KEY not configured");
        return res.status(500).json({ error: "Transcription service not configured" });
      }

      const openai = new OpenAI({ apiKey });

      // Read the uploaded file
      const audioFilePath = req.file.path;
      const audioFile = fs.createReadStream(audioFilePath);

      // Call OpenAI Whisper API
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
        response_format: "text",
      });

      // Clean up the temp file
      fs.unlink(audioFilePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });

      res.json({ text: transcription });
    } catch (error: any) {
      console.error("Transcription error:", error);
      
      // Clean up temp file on error
      if (req.file?.path) {
        fs.unlink(req.file.path, () => {});
      }

      if (error.status === 401) {
        return res.status(401).json({ error: "Invalid API key" });
      }
      
      res.status(500).json({ error: "Failed to transcribe audio" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
