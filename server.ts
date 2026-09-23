import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Gemini Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Health check endpoint for Cloud Run and container liveness probes
  app.get("/health", (req, res) => {
    res.status(200).send("OK");
  });

  // API endpoint for Gemini MBS Variations
  app.post("/api/gemini/variasi", async (req, res) => {
    try {
      const { teksAsal } = req.body;
      if (!teksAsal || typeof teksAsal !== "string" || !teksAsal.trim()) {
        return res.status(400).json({ error: "Sila masukkan teks aduan." });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(503).json({ error: "Kunci API Gemini belum dikonfigurasi pada pelayan." });
      }

      const prompt = `Anda adalah pembantu penulisan laporan rasmi. Berdasarkan pernyataan aduan (MBS) berikut, berikan 3 variasi aduan alternatif yang lebih kemas, formal dan jelas dalam Bahasa Melayu.

Pernyataan asal: "${teksAsal.trim()}"`;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "Anda adalah pembantu penulisan laporan rasmi kerajaan Malaysia. Anda sentiasa membalas dalam format JSON array of strings yang mengandungi tepat 3 pilihan ayat alternatif yang formal, kemas, dan matang tanpa sebarang penerangan tambahan atau teks pengenalan di luar JSON array.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING
            },
            description: "Senarai mengandungi tepat 3 pilihan ayat alternatif"
          }
        }
      });

      const text = response.text;
      if (!text) {
        throw new Error("Respons daripada model Gemini kosong.");
      }

      const variations = JSON.parse(text);
      return res.json({ variations });
    } catch (error: any) {
      console.error("Gemini API error:", error);
      return res.status(500).json({ error: error.message || "Gagal menjana variasi ayat." });
    }
  });

  // Vite middleware setup or Static file serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve the built frontend
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV})`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log("Shutting down server...");
    server.close(() => {
      console.log("Server closed.");
      process.exit(0);
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((err) => {
  console.error("Error starting full-stack server:", err);
});
