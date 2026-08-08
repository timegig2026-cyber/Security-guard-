import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Set payload limit high for Base64 watermarked photos
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATA_FILE = path.join(process.cwd(), "data_store.json");

// Ensure data store file exists
function initDataStore() {
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = {
      shifts: [],
      patrols: [],
      photos: []
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2), "utf8");
  }
}

initDataStore();

// Read data from local JSON store
function readDataStore() {
  try {
    initDataStore();
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading data store:", err);
    return { shifts: [], patrols: [], photos: [] };
  }
}

// Write data to local JSON store
function writeDataStore(data: any) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (err) {
    console.error("Error writing to data store:", err);
    return false;
  }
}

// Initialize Gemini Client
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ==================== API ROUTES ====================

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", geminiConfigured: !!process.env.GEMINI_API_KEY });
});

// SHIFTS ENDPOINTS
app.get("/api/shifts", (req, res) => {
  const store = readDataStore();
  res.json(store.shifts || []);
});

app.post("/api/shifts", (req, res) => {
  const newShift = req.body;
  if (!newShift || !newShift.id) {
    return res.status(400).json({ error: "Invalid shift payload" });
  }
  const store = readDataStore();
  const index = store.shifts.findIndex((s: any) => s.id === newShift.id);
  if (index >= 0) {
    store.shifts[index] = newShift;
  } else {
    store.shifts.push(newShift);
  }
  writeDataStore(store);
  res.json({ success: true, shift: newShift });
});

app.delete("/api/shifts/:id", (req, res) => {
  const id = req.params.id;
  const store = readDataStore();
  store.shifts = store.shifts.filter((s: any) => s.id !== id);
  writeDataStore(store);
  res.json({ success: true });
});

app.post("/api/shifts/sync", (req, res) => {
  const clientShifts = req.body;
  if (!Array.isArray(clientShifts)) {
    return res.status(400).json({ error: "Expected array of shifts" });
  }
  const store = readDataStore();
  // Simple merge by ID, prefer client-side for newest creations
  const mergedMap = new Map();
  store.shifts.forEach((s: any) => mergedMap.set(s.id, s));
  clientShifts.forEach((s: any) => mergedMap.set(s.id, s));
  store.shifts = Array.from(mergedMap.values());
  writeDataStore(store);
  res.json({ success: true, shifts: store.shifts });
});

// PATROLS ENDPOINTS
app.get("/api/patrols", (req, res) => {
  const store = readDataStore();
  res.json(store.patrols || []);
});

app.post("/api/patrols", (req, res) => {
  const newPatrol = req.body;
  if (!newPatrol || !newPatrol.id) {
    return res.status(400).json({ error: "Invalid patrol payload" });
  }
  const store = readDataStore();
  const index = store.patrols.findIndex((p: any) => p.id === newPatrol.id);
  if (index >= 0) {
    store.patrols[index] = newPatrol;
  } else {
    store.patrols.push(newPatrol);
  }
  writeDataStore(store);
  res.json({ success: true, patrol: newPatrol });
});

app.delete("/api/patrols/:id", (req, res) => {
  const id = req.params.id;
  const store = readDataStore();
  store.patrols = store.patrols.filter((p: any) => p.id !== id);
  writeDataStore(store);
  res.json({ success: true });
});

app.post("/api/patrols/sync", (req, res) => {
  const clientPatrols = req.body;
  if (!Array.isArray(clientPatrols)) {
    return res.status(400).json({ error: "Expected array of patrols" });
  }
  const store = readDataStore();
  const mergedMap = new Map();
  store.patrols.forEach((p: any) => mergedMap.set(p.id, p));
  clientPatrols.forEach((p: any) => mergedMap.set(p.id, p));
  store.patrols = Array.from(mergedMap.values());
  writeDataStore(store);
  res.json({ success: true, patrols: store.patrols });
});

// PHOTOS ENDPOINTS
app.get("/api/photos", (req, res) => {
  const store = readDataStore();
  res.json(store.photos || []);
});

app.post("/api/photos", (req, res) => {
  const newPhoto = req.body;
  if (!newPhoto || !newPhoto.id) {
    return res.status(400).json({ error: "Invalid photo payload" });
  }
  const store = readDataStore();
  const index = store.photos.findIndex((p: any) => p.id === newPhoto.id);
  if (index >= 0) {
    store.photos[index] = newPhoto;
  } else {
    store.photos.push(newPhoto);
  }
  writeDataStore(store);
  res.json({ success: true, photo: newPhoto });
});

app.delete("/api/photos/:id", (req, res) => {
  const id = req.params.id;
  const store = readDataStore();
  store.photos = store.photos.filter((p: any) => p.id !== id);
  writeDataStore(store);
  res.json({ success: true });
});

app.post("/api/photos/sync", (req, res) => {
  const clientPhotos = req.body;
  if (!Array.isArray(clientPhotos)) {
    return res.status(400).json({ error: "Expected array of photos" });
  }
  const store = readDataStore();
  const mergedMap = new Map();
  store.photos.forEach((p: any) => mergedMap.set(p.id, p));
  clientPhotos.forEach((p: any) => mergedMap.set(p.id, p));
  store.photos = Array.from(mergedMap.values());
  writeDataStore(store);
  res.json({ success: true, photos: store.photos });
});

// WIPE DATABASE
app.post("/api/system/wipe", (req, res) => {
  const emptyData = { shifts: [], patrols: [], photos: [] };
  writeDataStore(emptyData);
  res.json({ success: true });
});

// GEMINI SECURE REPORT AUDITOR ENDPOINT
app.post("/api/reports/generate", async (req, res) => {
  try {
    const { shifts, patrols, photos } = req.body;

    const summaryPrompt = `
You are a highly professional National Security Advisor and Senior Security Operations Center (SOC) Lead.
Your task is to analyze the following offline logs for a security officer's shift duty and generate a detailed, authoritative, and audit-ready Shift Security Report.

### RAW DATA FOR CURRENT LOGS:
1. SHIFTS LOGGED:
${JSON.stringify(shifts || [], null, 2)}

2. PATROL SESSIONS LOGGED:
${JSON.stringify(patrols || [], null, 2)}

3. CAPTURED VISUAL MEDIA VERIFICATIONS (without base64 contents for length):
${JSON.stringify((photos || []).map((p: any) => ({ id: p.id, timestamp: p.timestamp, visitType: p.visitType, notes: p.notes, location: p.location })), null, 2)}

### REPORT REQUIREMENTS:
- Provide an elegant title (e.g., "TACTICAL SECURITY SHIFT SUMMARY & INCIDENT AUDIT").
- Format the output with clear Markdown.
- Ensure proper visual hierarchy (using H1, H2, H3 headers, lists, and tables).
- Provide key metrics (e.g. Total hours logged, shift pay, completed vs missed checkpoint rounds, visit ratio).
- Generate a "Tactical Assessment & Incidents Analysis" detailing whether any patrol was missed or went into warning/alarm status, and evaluate the response.
- Create a "Photo Verification Evidence Checklist" listing the stamp details.
- Provide a set of 3 actionable, highly professional security recommendations for the next duty guard based on this data.
- Do not use generic filler words like "supercharge" or "empower". Use precise security terminology like "perimeter breach mitigation", "clocking compliance", "escalation protocols", and "audit readiness".

Please make it look extremely clean, detailed, and organized.
`;

    if (!ai) {
      // Fallback response if GEMINI_API_KEY is not defined
      const mockReport = `
# 🚨 TACTICAL SECURITY SHIFT SUMMARY & INCIDENT AUDIT
*Note: This is an automatically generated local offline template. To activate full AI intelligence, please register your **GEMINI_API_KEY** in AI Studio's Secrets panel.*

### 📋 EXECUTIVE SUMMARY
- **Total Registered Shifts:** ${shifts?.length || 0}
- **Total Patrol Runs:** ${patrols?.length || 0}
- **Visual Evidence Counts:** ${photos?.length || 0} photo logs.

### 🔍 PATROL COMPLIANCE AUDIT
${
  patrols && patrols.length > 0
    ? patrols.map((p: any) => `* **${p.title}**: Status is **${p.status.toUpperCase()}** with ${p.clockPoints?.filter((pt: any) => pt.isClocked).length || 0}/${p.totalPoints} checkpoints verified.`).join("\n")
    : "No active patrols found in the local database to audit."
}

### 📸 VISUAL EVIDENCE LOGS
${
  photos && photos.length > 0
    ? photos.map((p: any) => `* [${p.timestamp}] **${p.visitType}** at *${p.location || "N/A"}* — notes: "${p.notes || "None"}"`).join("\n")
    : "No media verification photos captured."
}

### 💡 SYSTEM ADVISORY
Please configure the \`GEMINI_API_KEY\` variable in the **Settings > Secrets** panel to enable the deep neural security auditing engine.
`;
      return res.json({ summary: mockReport, isMock: true });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: summaryPrompt,
    });

    res.json({ summary: response.text || "Failed to generate report.", isMock: false });
  } catch (error: any) {
    console.error("Gemini report generation error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ====================================================

// Vite middleware configuration or production static serve
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
