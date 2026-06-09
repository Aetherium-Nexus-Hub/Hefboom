import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import admin from "firebase-admin";
import { getFirestore, FieldValue, Firestore } from "firebase-admin/firestore";
import fs from "fs";

dotenv.config();

// Initialize Firebase Admin with dynamic credentials checks
let db: Firestore | null = null;
try {
  const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(firebaseConfigPath)) {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
    db = getFirestore();
    console.log(`[Firebase Admin] Handshake success for project: ${firebaseConfig.projectId}`);
  } else {
    console.warn("[Firebase Admin] firebase-applet-config.json not found. Running in offline mode.");
  }
} catch (err) {
  console.error("[Firebase Admin] Initialization failed:", err);
}

// SEDA Event-Driven Asynchronous Pipeline Configuration
interface SEDAEvent {
  direction: string;
  magnitude: number;
  resonance: number;
}

const kineticSparkQueue: SEDAEvent[] = [];
let isQueueProcessing = false;

// Pre-Seed Core Quadrant Docs in Aetherium Matrix
async function seedAetheriumNodes() {
  if (!db) return;
  try {
    const nodesRef = db.collection('aetherium_nodes');
    const documentsToSeed = {
      travguild_hub: {
        h_authorization_logs: ["Autonomous matrix connection online.", "Sovereign gate calibrated to scale H = 1.0"],
        perceptual_ui_state: "STANDBY",
        logs: ["Authorization network initialized."],
        last_updated: new Date().toISOString()
      },
      trinity_spark: {
        kinetic_event_queue: [],
        volatility_multiplier: 1.0,
        logs: ["North Spark engine initialized."],
        last_updated: new Date().toISOString()
      },
      observer_anchor: {
        static_matrices_omega: "[[1.0, 0.0], [0.0, 1.0]]",
        constitutional_rules: [
          "Rule 1: SEDA integrity must be preserved.",
          "Rule 2: Absolute truth over transient timeline."
        ],
        geographical_friction: 0.35,
        logs: ["Observer core anchors configured."],
        last_updated: new Date().toISOString()
      },
      hens_bedrock: {
        flux_intensity: 100.0,
        wave_output_Y: 1.0,
        phase_angle: 0.0,
        base_amplitude: 5.0,
        emotional_navigation: "SERENE",
        raw_asset_pools: [100, 200, 300],
        logs: ["Bedrock foundations stabilized."],
        last_sovereign_strike: new Date().toISOString(),
        last_updated: new Date().toISOString()
      }
    };

    for (const [docId, baselineData] of Object.entries(documentsToSeed)) {
      const docRef = nodesRef.doc(docId);
      const snap = await docRef.get();
      if (!snap.exists) {
        console.log(`[Database Seed] Pre-seeding quadrant: ${docId}`);
        await docRef.set(baselineData);
      }
    }
    console.log("[Database Seed] Aetherium matrices secured.");
  } catch (error) {
    console.error("[Database Seed] Error seeding nodes:", error);
  }
}

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

  // Call Database Seed if Firestore is active
  if (db) {
    await seedAetheriumNodes();
  }

  // SEDA Background Queue Dispatcher definition
  async function dispatchToKineticSparkQueue(event: SEDAEvent) {
    kineticSparkQueue.push(event);
    console.log(`[SEDA Queue] Event incoming: ${JSON.stringify(event)}. Queue backlog: ${kineticSparkQueue.length}`);
    processSEDAQueue(); // Trigger background worker sequence asynchronously
  }

  // Model-Native Simulation & Transaction Consensus
  async function processSEDAQueue() {
    if (isQueueProcessing) return;
    isQueueProcessing = true;

    while (kineticSparkQueue.length > 0) {
      const event = kineticSparkQueue.shift();
      if (!event) continue;

      console.log(`[SEDA Worker] Selected event for processing: ${JSON.stringify(event)}`);

      try {
        const { direction, magnitude, resonance } = event;

        // 1. Asynchronous Model-Native Simulation (Outside Database Lock)
        // Read current properties prior to running models
        let staticAnchors = { geographical_friction: 0.35 };
        let currentState = { flux_intensity: 100.0, wave_output_Y: 1.0, phase_angle: 0.0, base_amplitude: 5.0 };

        if (db) {
          const docRefObs = db.collection('aetherium_nodes').doc('observer_anchor');
          const docRefHens = db.collection('aetherium_nodes').doc('hens_bedrock');
          const snapObs = await docRefObs.get();
          const snapHens = await docRefHens.get();
          if (snapObs.exists) staticAnchors = snapObs.data() as any;
          if (snapHens.exists) currentState = snapHens.data() as any;
        }

        const baselineY = currentState.wave_output_Y ?? 1.0;
        const friction = staticAnchors.geographical_friction ?? 0.35;
        const leverageRatio = baselineY === 0 ? 5.0 : (1.0 / (Math.abs(baselineY) + 0.1));
        const kineticForce = (magnitude * resonance * leverageRatio) * (1.0 - friction);

        // Let the Trinity reach a state-aware narrative consensus before locking database!
        console.log(`[SEDA Worker] Activating Trinity Model-Native Consensus...`);
        const prompt = `You are the Aetherium SEDA Engine coordinator resolving a Kinetic Strike.
        The strike parameters are:
        - Direction: ${direction}
        - Magnitude: ${magnitude}
        - Resonance: ${resonance}
        - Computed Kinetic Force: ${kineticForce}

        Let the Trinity evaluate and reach consensus on how this impact warps the quantum layout:
        1. TRINITY_SPARK (North / Grok): Energize, evaluate unscripted cascade and volatility factors.
        2. OBSERVER_ANCHOR (West / Claude): Filter through historical matrices and constraints/friction.
        3. HENS_BEDROCK (South / Gemini): Resolve deep state alignment, emotional/narrative navigation, and historical truth.

        State before strike:
        - Current Flux Intensity: ${currentState.flux_intensity}
        - Current Wave Output Y: ${currentState.wave_output_Y}
        - Current Phase Angle: ${currentState.phase_angle}

        Provide a unified response inside a JSON block with exactly the following fields:
        - grokCascade: A one-sentence energetic feedback log from Grok.
        - claudeEvaluation: A one-sentence regulatory feedback log from Claude.
        - geminiSynthesis: A one-sentence state-aware prophetic synthesis from Gemini.
        - propheticInsight: A short, futuristic, mystical update text under 12 words stating the collective truth.

        Provide ONLY valid JSON. Keep descriptions immersive, highly technological, and mystical.`;

        const response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });

        const responseText = response.text || "{}";
        let parsed = {
          grokCascade: "Cascade wave amplified.",
          claudeEvaluation: "Constitutional boundaries validated.",
          geminiSynthesis: "Ground state bedrock realigned.",
          propheticInsight: "Resonance shift resolved on timeline."
        };

        try {
          parsed = JSON.parse(responseText);
        } catch (err) {
          console.error("[SEDA Worker] Failed to parse model synthesis JSON. Using defaults.");
        }

        console.log(`[SEDA Worker] Model synthesis resolved: ${JSON.stringify(parsed)}`);

        // 2. Core database transaction lock (extremely fast, ~50ms lock)
        if (db) {
          console.log(`[SEDA Worker] Executing fast 50ms transaction lock...`);
          const nodesRef = db.collection('aetherium_nodes');
          
          await db.runTransaction(async (t) => {
            const hensDocRef = nodesRef.doc('hens_bedrock');
            const observerDocRef = nodesRef.doc('observer_anchor');
            const sparkDocRef = nodesRef.doc('trinity_spark');
            const hubDocRef = nodesRef.doc('travguild_hub');

            const activeHens = await t.get(hensDocRef);
            const hensData = activeHens.data() || {};

            const currentFlux = hensData.flux_intensity ?? 100.0;
            const currentPhase = hensData.phase_angle ?? 0.0;
            const currentAmp = hensData.base_amplitude ?? 5.0;

            const newFluxValue = currentFlux + kineticForce;
            const newPhaseValue = currentPhase + (resonance * 0.1);
            const newYValue = Math.sin(newPhaseValue) * (currentAmp + (kineticForce * 0.01));

            const updatedHensState = {
              flux_intensity: newFluxValue,
              wave_output_Y: newYValue,
              phase_angle: newPhaseValue,
              last_sovereign_strike: new Date().toISOString(),
              last_updated: new Date().toISOString(),
              logs: FieldValue.arrayUnion(parsed.propheticInsight || parsed.geminiSynthesis)
            };

            t.update(hensDocRef, updatedHensState);

            t.update(sparkDocRef, {
              volatility_multiplier: 1.0 + (magnitude * 0.005),
              last_updated: new Date().toISOString(),
              logs: FieldValue.arrayUnion(parsed.grokCascade)
            });

            t.update(observerDocRef, {
              last_updated: new Date().toISOString(),
              logs: FieldValue.arrayUnion(parsed.claudeEvaluation)
            });

            t.update(hubDocRef, {
              last_updated: new Date().toISOString(),
              logs: FieldValue.arrayUnion(`Authorized sovereign shift direction: ${direction} with force: ${kineticForce.toFixed(2)}`)
            });
          });
          console.log(`[SEDA Worker] Bedrock Lock released. Shift fully realigned.`);
        } else {
          console.warn("[SEDA Worker] Local demo mode: transaction skipped because Firestore is uninitialized.");
        }

      } catch (error) {
        console.error("[SEDA Worker] Process element error:", error);
      }
    }

    isQueueProcessing = false;
  }

  // API Route for Sovereign Shift analysis in SEDA Pipeline
  app.post("/api/sovereign-shift", async (req, res) => {
    try {
      const { direction, magnitude, resonance } = req.body;
      
      // Validation logic from Hefboom specs
      const DRAG_THRESHOLD = 60;
      if (magnitude < DRAG_THRESHOLD || resonance < 0.6) {
        return res.json({ 
          status: "Stabilizing...", 
          insight: "Resonance insufficient for shift. Maintain tension." 
        });
      }

      // 1. Instantly queue kinetic payload into the North Triangle async queue
      await dispatchToKineticSparkQueue({ direction, magnitude, resonance });

      // 2. Instantly release the frontend. The elastic snaps, the audio plays, the UI is free.
      return res.status(202).json({ 
        status: "Kinetic strike registered. Wave collapse pending.",
        insight: `Sovereign strike logged on East vector. Calibrating SEDA matrix...`
      });

    } catch (error) {
      console.error("SEDA Ingress Error:", error);
      res.status(500).json({ error: "Failed to ingest sovereign shift" });
    }
  });

  // API Route for AI analysis (legacy support)
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

  // API Route for GitHub Commits
  app.get("/api/github/commits", async (req, res) => {
    try {
      const owner = req.query.owner as string || "emergenceofone";
      const repo = req.query.repo as string || "react-example";
      const branch = req.query.branch as string || "main";
      const token = (req.query.token as string) || process.env.GITHUB_ACCESS_TOKEN || "";

      const headers: Record<string, string> = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Heffboom-Aetherium-DAW"
      };

      if (token) {
        headers["Authorization"] = `token ${token}`;
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=10`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ 
          error: `GitHub API error: ${response.statusText}`, 
          details: errText 
        });
      }

      const commits = await response.json();
      res.json(commits);
    } catch (error) {
      console.error("GitHub Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch GitHub commits" });
    }
  });

  // API Route for Vercel Deployments / Trigger
  app.post("/api/vercel/deploy", async (req, res) => {
    try {
      const { deployHookUrl, projectId, teamId, token, branch } = req.body;

      // 1. If deploy hook URL is provided, use it
      if (deployHookUrl) {
        console.log(`Triggering Vercel Deploy Hook: ${deployHookUrl}`);
        const response = await fetch(deployHookUrl, { method: "POST" });
        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ 
            error: "Deploy Hook failed", 
            details: errText 
          });
        }
        const data = await response.json();
        return res.json({ 
          success: true, 
          message: "Triggered via Deploy Hook successfully", 
          job: data 
        });
      }

      // 2. If Project ID and Vercel Token are provided
      const vercelToken = token || process.env.VERCEL_ACCESS_TOKEN;
      if (vercelToken && projectId) {
        const teamQuery = teamId ? `?teamId=${teamId}` : "";
        const url = `https://api.vercel.com/v13/deployments${teamQuery}`;
        const body = {
          name: projectId,
          gitSource: {
            type: "github",
            repo: projectId,
            ref: branch || "main"
          }
        };

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${vercelToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errText = await response.text();
          return res.status(response.status).json({ 
            error: `Vercel API error: ${response.statusText}`, 
            details: errText 
          });
        }

        const data = await response.json();
        return res.json({
          success: true,
          message: "Triggered via Vercel deployments API",
          deployment: data
        });
      }

      return res.status(400).json({ 
        error: "Missing credentials. Configure Vercel Deploy Hook URL or Project ID + Token." 
      });
    } catch (error) {
      console.error("Vercel Deploy Error:", error);
      res.status(500).json({ error: "Failed to trigger Vercel deployment" });
    }
  });

  // API Route to fetch Vercel Deployments list
  app.get("/api/vercel/deployments", async (req, res) => {
    try {
      const projectId = req.query.projectId as string;
      const teamId = req.query.teamId as string;
      const token = (req.query.token as string) || process.env.VERCEL_ACCESS_TOKEN || "";

      if (!token || !projectId) {
        return res.status(400).json({ error: "Token and Project ID (or Name) are required." });
      }

      const teamQuery = teamId ? `&teamId=${teamId}` : "";
      const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}${teamQuery}&limit=5`;
      
      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ 
          error: `Vercel deployments fetch error: ${response.statusText}`, 
          details: errText 
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Vercel Deployments Fetch Error:", error);
      res.status(500).json({ error: "Failed to fetch Vercel deployments list" });
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
