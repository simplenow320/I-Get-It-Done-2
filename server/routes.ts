import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";

const upload = multer({ 
  dest: "/tmp/audio-uploads/",
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Transcription endpoint using Deepgram
  app.post("/api/transcribe", upload.single("audio"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No audio file provided" });
      }

      const apiKey = process.env.DEEPGRAM_API_KEY;
      if (!apiKey) {
        console.error("DEEPGRAM_API_KEY not configured");
        return res.status(500).json({ error: "Transcription service not configured" });
      }

      const audioFilePath = req.file.path;
      const audioBuffer = fs.readFileSync(audioFilePath);
      
      console.log("Sending audio to Deepgram, size:", audioBuffer.length, "bytes");

      // Call Deepgram API
      const response = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "audio/m4a",
        },
        body: audioBuffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Deepgram error:", response.status, errorText);
        throw new Error(`Deepgram API error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Deepgram response:", JSON.stringify(result, null, 2));

      // Clean up the temp file
      fs.unlink(audioFilePath, (err) => {
        if (err) console.error("Failed to delete temp file:", err);
      });

      // Extract transcript from Deepgram response
      const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      
      res.json({ text: transcript });
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
