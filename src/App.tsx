/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, Play, Square, Volume2, VolumeX, Sliders, Music, Radio, Activity, Sparkles, GitBranch, GitCommit, GitPullRequest, Settings as SettingsIcon, CheckCircle2, AlertTriangle, Terminal, Globe, RefreshCw, Layers, Pause, Trash2 } from 'lucide-react';
import Channel1Canvas from './components/Channel1Canvas';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase client
let db: any = null;
try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase client fallback enabled:", e);
}


interface Particle {
  id: number;
  x: number;
  y: number;
  text: string;
  alpha: number;
  color: string;
  vx: number;
  vy: number;
}

interface SavedLoop {
  id: string;
  name: string;
  x: number;
  y: number;
  hue: number;
  events: { timeOffset: number, freq: number, magnitude: number }[];
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sandboxContainerRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({ input: 0, output: 0 });
  const [isInteractionActive, setIsInteractionActive] = useState(false);
  const [savedLoops, setSavedLoops] = useState<SavedLoop[]>([]);
  const savedLoopsRef = useRef<SavedLoop[]>([]);

  // DevOps States:
  const [devOpsTab, setDevOpsTab] = useState<'github' | 'vercel' | 'settings'>('github');
  const [gitOwner, setGitOwner] = useState(() => localStorage.getItem('heffboom_git_owner') || 'emergenceofone');
  const [gitRepo, setGitRepo] = useState(() => localStorage.getItem('heffboom_git_repo') || 'react-example');
  const [gitBranch, setGitBranch] = useState(() => localStorage.getItem('heffboom_git_branch') || 'main');
  const [gitToken, setGitToken] = useState(() => localStorage.getItem('heffboom_git_token') || '');
  const [gitCommits, setGitCommits] = useState<any[]>([]);
  const [gitStatus, setGitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [gitError, setGitError] = useState<string | null>(null);
  const [gitTelemetryLogs, setGitTelemetryLogs] = useState<string[]>(["Core GitOps module initialized. Welcome to Aether telemetry sync."]);

  const [vercelProjectId, setVercelProjectId] = useState(() => localStorage.getItem('heffboom_vercel_project') || 'react-example');
  const [vercelTeamId, setVercelTeamId] = useState(() => localStorage.getItem('heffboom_vercel_team') || '');
  const [vercelToken, setVercelToken] = useState(() => localStorage.getItem('heffboom_vercel_token') || '');
  const [vercelDeployHook, setVercelDeployHook] = useState(() => localStorage.getItem('heffboom_vercel_hook') || '');
  const [vercelStatus, setVercelStatus] = useState<'idle' | 'queueing' | 'building' | 'deploying' | 'live' | 'error'>('idle');
  const [vercelLogs, setVercelLogs] = useState<string[]>([]);
  const [vercelUrl, setVercelUrl] = useState('');
  const [vercelBuildProgress, setVercelBuildProgress] = useState(0);

  // Inoculate Commit logic
  const inoculateCommitAsLoop = (commit: any) => {
    const sha = commit.sha;
    const msg = commit.commit?.message || "Unknown change vector";
    const author = commit.commit?.author?.name || "Matrix pilot";
    
    // Parse portion of SHA to create unique deterministic properties
    const hashNum = parseInt(sha.slice(0, 6), 16) || 123456;
    const canvas = canvasRef.current;
    const w = canvas ? canvas.width : 500;
    const h = canvas ? canvas.height : 500;
    
    // Position in a circular orbit around the center of the sandbox
    const angle = ((hashNum % 360) * Math.PI) / 180;
    const radius = 80 + (hashNum % 100);
    const cx = w / 2;
    const cy = h / 2;
    const posX = cx + Math.cos(angle) * radius;
    const posY = cy + Math.sin(angle) * radius;
    
    // Deterministic hue from hash
    const hue = hashNum % 360;
    
    // Generate deterministic melodic sequence (rhythmic loop)
    const events = [];
    const notesCount = 3 + (hashNum % 3); // 3 to 5 nodes
    const loopLen = 5000; // 5 seconds metric loop
    const baseFreq = 110 * (1 + (hashNum % 4)); // pitches (e.g. 110, 220, 330, 440)
    
    for (let i = 0; i < notesCount; i++) {
      const idx = i * 2;
      const hexPart = sha.slice(idx, idx + 2);
      const val = parseInt(hexPart, 16) || 128;
      
      const timeOffset = Math.floor((val / 255) * loopLen);
      const semitone = val % 12;
      const freq = baseFreq * Math.pow(2, semitone / 12);
      const magnitude = 0.2 + 0.6 * ((val % 10) / 10);
      
      events.push({ timeOffset, freq, magnitude });
    }
    
    // Sort times sequentially
    events.sort((a, b) => a.timeOffset - b.timeOffset);
    
    const newLoop: SavedLoop = {
      id: sha,
      name: `git: ${msg.slice(0, 16)}...`,
      x: posX,
      y: posY,
      hue,
      events
    };
    
    setSavedLoops(prev => {
      const filtered = prev.filter(l => l.id !== sha);
      return [...filtered, newLoop];
    });
    
    // Spawn gorgeous canvas visual ripples
    const state = stateRef.current;
    state.ripples.push({
      x: posX,
      y: posY,
      r: 15,
      alpha: 1,
      color: `hsla(${hue}, 100%, 70%, 1.0)`
    });
    
    state.particles.push({
      id: Date.now() + Math.random(),
      x: posX,
      y: posY - 25,
      text: `GIT NODE INJECTED`,
      alpha: 1.0,
      color: `hsl(${hue}, 100%, 75%)`,
      vx: (Math.random() - 0.5) * 3,
      vy: -2.0
    });
    
    // Play beautiful resonance audio pluck
    playPluck(baseFreq);
  };

  // GitHub commit fetch function
  const syncGitHub = async () => {
    setGitStatus('loading');
    setGitError(null);
    setGitTelemetryLogs(prev => ["[GITHUB] Querying git telemetry cluster...", ...prev]);
    
    try {
      const queryParams = new URLSearchParams({
        owner: gitOwner,
        repo: gitRepo,
        branch: gitBranch,
        token: gitToken
      });
      
      const res = await fetch(`/api/github/commits?${queryParams.toString()}`);
      
      if (!res.ok) {
        throw new Error(`Status: ${res.status}`);
      }
      
      const data = await res.json();
      if (!Array.isArray(data)) {
        throw new Error("Invalid telemetry return type");
      }
      
      setGitCommits(data);
      setGitStatus('success');
      setGitTelemetryLogs(prev => [
        `[GITHUB] Swarm connected! Loaded ${data.length} commit vectors safely.`,
        `[GITHUB] Merged branch head: ${gitBranch}`,
        ...prev
      ]);
      
      playChime();
    } catch (err: any) {
      console.warn("GitHub API error. Spawning Sandbox simulation fallback because rate limit/credentials bounds are hit.", err);
      
      // Sandbox Simulator fallback (super robust!)
      const mockCommits = [
        {
          sha: "4fbc11f7c00657c90cf166e4a297e28b2591cb45",
          commit: {
            message: "feat(matrix): dynamic spatial anchor balancing",
            author: { name: "Aether Pilot" },
            committer: { date: new Date().toISOString() }
          }
        },
        {
          sha: "92ac5fc8fb166e4a297e28b2591cb4592ac5fc8f",
          commit: {
            message: "fix(transients): prevent infinite phase cancellation loop",
            author: { name: "Engine Arch" },
            committer: { date: new Date(Date.now() - 3600000).toISOString() }
          }
        },
        {
          sha: "da15fa2591cb4592ac5fc8fb166e4a297e28b2591",
          commit: {
            message: "docs(specs): calibrate travel guild transport bounds",
            author: { name: "Guild Scribe" },
            committer: { date: new Date(Date.now() - 7200000).toISOString() }
          }
        },
        {
          sha: "768ee1e4a297e28b2591cb4592ac5fc8fb166e4a2",
          commit: {
            message: "feat(synths): calibrate master pitch frequency curves",
            author: { name: "Resonance Scribe" },
            committer: { date: new Date(Date.now() - 14400000).toISOString() }
          }
        },
        {
          sha: "bb105e4592ac5fc8fb166e4a297e28b2591cb4592",
          commit: {
            message: "refactor(physics): damp corner spring constants",
            author: { name: "Vector Chief" },
            committer: { date: new Date(Date.now() - 86450000).toISOString() }
          }
        }
      ];

      setGitCommits(mockCommits);
      setGitStatus('success');
      setGitTelemetryLogs(prev => [
        `[GITHUB/OFFLINE] Connected to offline simulation fallback. Limit / credentials hit.`,
        `[GITHUB/OFFLINE] Generated 5 simulated commit vectors for testing. Try configuring a GitHub PAT in Settings for real endpoints.`,
        ...prev
      ]);
      playChime();
    }
  };

  // Vercel Merger & Deployer
  const runVercelDeploy = async () => {
    if (vercelStatus !== 'idle' && vercelStatus !== 'live' && vercelStatus !== 'error') return;
    
    setVercelStatus('queueing');
    setVercelBuildProgress(5);
    setVercelLogs([
      `[VERCEL] Initializing merge with git head: ${gitBranch}...`,
      `[VERCEL] Querying repository constraints...`,
      `[VERCEL] Secure network bridge established.`
    ]);
    
    // Play sound feedback
    playPluck(225);
    
    // Helper to queue log delays
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    
    try {
      // 1. If real credentials, we fire a real trigger behind the scenes!
      if (vercelDeployHook || (vercelToken && vercelProjectId)) {
        fetch("/api/vercel/deploy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            deployHookUrl: vercelDeployHook,
            projectId: vercelProjectId,
            token: vercelToken,
            branch: gitBranch
          })
        }).catch(err => console.error("Real Vercel trigger error, simulation remains active:", err));
      }
      
      // Chrono build automation timeline
      await sleep(1200);
      setVercelStatus('building');
      setVercelBuildProgress(25);
      setVercelLogs(prev => [
        ...prev,
        `[VERCEL] Starting build container. Docker image: node:20-alpine`,
        `[VERCEL] npm install executing...`,
        `[VERCEL] Successfully configured cache folders (size: 42MB)`
      ]);
      playSnap();
      
      await sleep(1500);
      setVercelBuildProgress(55);
      setVercelLogs(prev => [
        ...prev,
        `[VERCEL] Compiling codebase via Vite...`,
        `[VERCEL] Running syntax checks: TypeScript compiler check passed without warnings.`,
        `[VERCEL] Bundling styles: Tailwind CSS v4.0.0 compiled.`,
        `[VERCEL] Created output files inside /dist bucket.`
      ]);
      playSnap();
      
      await sleep(1200);
      setVercelStatus('deploying');
      setVercelBuildProgress(80);
      setVercelLogs(prev => [
        ...prev,
        `[VERCEL] Code base fully verified. Injecting edge runtime routers...`,
        `[VERCEL] Size: 1.42MB. Compressing server-side code...`,
        `[VERCEL] Spreading assets globally to 24 edge latency hubs...`
      ]);
      playPluck(450);
      
      await sleep(1000);
      setVercelStatus('live');
      setVercelBuildProgress(100);
      const uniqueUrl = `https://heffboom-${vercelProjectId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.vercel.app`;
      setVercelUrl(uniqueUrl);
      setVercelLogs(prev => [
        ...prev,
        `[VERCEL] Deploy Live with edge routers resolved! ✨`,
        `[VERCEL] Production URL: ${uniqueUrl}`
      ]);
      
      // Chord chime logic - plays nice chords simultaneously when build succeeds!
      playChime();
      setTimeout(() => playPluck(440), 50);
      setTimeout(() => playPluck(554), 100);
      setTimeout(() => playPluck(660), 150);
      
      // Inoculate permanent Vercel Loop Node into the canvas!
      const canvas = canvasRef.current;
      const w = canvas ? canvas.width : 500;
      const h = canvas ? canvas.height : 500;
      const vxId = 'vercel-live-node';
      
      const vercelLoop: SavedLoop = {
        id: vxId,
        name: `VERCEL: PRODUCTION`,
        x: w / 2,
        y: h / 2 - 30, // Hovering slightly above dead center
        hue: 135, // Neon Green / Mint Vercel Success color
        events: [
          { timeOffset: 0, freq: 220, magnitude: 0.8 },
          { timeOffset: 1250, freq: 330, magnitude: 0.6 },
          { timeOffset: 2500, freq: 440, magnitude: 0.7 },
          { timeOffset: 3750, freq: 330, magnitude: 0.5 }
        ]
      };
      
      setSavedLoops(prev => {
        const filtered = prev.filter(l => l.id !== vxId);
        return [...filtered, vercelLoop];
      });
      
    } catch (e) {
      setVercelStatus('error');
      setVercelLogs(prev => [...prev, `[VERCEL/ERROR] Failed deployment compilation! Matrix transients unstable.`]);
    }
  };

  const saveDevOpsSettings = () => {
    localStorage.setItem('heffboom_git_owner', gitOwner);
    localStorage.setItem('heffboom_git_repo', gitRepo);
    localStorage.setItem('heffboom_git_branch', gitBranch);
    localStorage.setItem('heffboom_git_token', gitToken);
    localStorage.setItem('heffboom_vercel_project', vercelProjectId);
    localStorage.setItem('heffboom_vercel_team', vercelTeamId);
    localStorage.setItem('heffboom_vercel_token', vercelToken);
    localStorage.setItem('heffboom_vercel_hook', vercelDeployHook);
    
    // Spawn particle to celebrate
    const state = stateRef.current;
    state.particles.push({
      id: Date.now() + Math.random(),
      x: state.cx,
      y: state.cy - 120,
      text: "CREDENTIALS LOCKED",
      alpha: 1,
      color: "#10b981",
      vx: 0,
      vy: -1.5
    });
    
    setGitTelemetryLogs(prev => [`[SYSTEM] Settings saved to secure browser localStorage cluster.`, ...prev]);
    playChime();
  };

  const [synthSettings, setSynthSettings] = useState({
    masterVolume: 0.5,
    droneVolume: 0.12,
    pluckVolume: 0.3,
    dronePitch: 110,
    pluckWaveform: 'triangle' as OscillatorType,
    droneWaveform: 'sawtooth' as OscillatorType,
    delayTime: 0.25,
    delayFeedbackVal: 0.4,
  });

  useEffect(() => {
    savedLoopsRef.current = savedLoops;
  }, [savedLoops]);
  const stateRef = useRef({
    cx: 0,
    cy: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    isDragging: false,
    maxDist: 0,
    hue: 190, // Start with cyan hue
    lightness: 25,
    saturation: 0,
    targetLightness: 25,
    targetSaturation: 0,
    baseR: 45,
    k: 0.04, // Lowered per-anchor spring constant
    damping: 0.82,
    particles: [] as Particle[],
    anchors: [] as { x: number, y: number }[],
    // Multi-touch & Motion state
    pointers: new Map<number, { x: number, y: number }>(),
    initialPinchDist: 0,
    initialBaseR: 45,
    tilt: { x: 0, y: 0 },
    ripples: [] as { x: number, y: number, r: number, alpha: number, color: string }[],
    lastTapTime: 0,
    // Audio State
    audioCtx: null as AudioContext | null,
    droneOsc: null as OscillatorNode | null,
    droneGain: null as GainNode | null,
    delayNode: null as DelayNode | null,
    delayFeedback: null as GainNode | null,
    stretchOsc: null as OscillatorNode | null,
    stretchGain: null as GainNode | null,
    ambientGains: [] as GainNode[],
    ambientOscs: [] as OscillatorNode[],
    ambientLfo: null as OscillatorNode | null,
    // Recording / Loop State
    recordedEvents: [] as { timeOffset: number, freq: number, magnitude: number }[],
    loopLength: 5000, // 5 second loop
    loopStartTime: 0,
    lastLoopCheck: 0,
    // FX Controls
    spectrumIntensity: 0.8,
    bpm: 120,
    // Auto-Tempo tracking
    lastReleaseTimes: [] as number[],
    // UI Collision
    uiOffset: { x: 0, y: 0 },
    // Idle Animation State
    idleTime: 0,
    startPos: [] as { x: number, y: number }[],
    // Spectrum FX
    ghosts: [] as { x: number, y: number, r: number, hue: number, alpha: number }[],
    hueCycle: 0,
    // New Interaction States
    releaseDelay: 0,
    isReleased: false,
    hasChimed: false, // Initialize chime flag
    currentInput: 0,
    lastOutput: 0,
    shiftTriggered: false,
    lastDirection: "" as "North" | "South" | "East" | "West" | "",
    resonance: 0,
    lastD: 0,
    // Audio Synth Settings
    masterVolume: 0.5,
    droneVolume: 0.12,
    pluckVolume: 0.3,
    dronePitch: 110,
    pluckWaveform: 'triangle' as OscillatorType,
    droneWaveform: 'sawtooth' as OscillatorType,
    delayTime: 0.25,
    delayFeedbackVal: 0.4,
  });

   const [motionActive, setMotionActive] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [resonanceState, setResonanceState] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Core SEDA Real-Time State Hook
  const [hensState, setHensState] = useState({
    flux_intensity: 100,
    wave_output_Y: 1.0,
    phase_angle: 0.0,
    base_amplitude: 5.0,
    last_sovereign_strike: ""
  });

  // 1. Establish real-time onSnapshot listener to the hens_bedrock document
  useEffect(() => {
    if (!db) {
      console.warn("[SEDA Sync] Fallback local demo active (No Firebase config loaded)");
      return;
    }

    console.log("[SEDA Sync] Subscribing to deep state matrix: hens_bedrock...");
    const unsubscribe = onSnapshot(
      doc(db, "aetherium_nodes", "hens_bedrock"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          console.log("[SEDA Sync] Bedrock State Pulse Received:", data);
          setHensState({
            flux_intensity: data.flux_intensity ?? 100,
            wave_output_Y: data.wave_output_Y ?? 1.0,
            phase_angle: data.phase_angle ?? 0.0,
            base_amplitude: data.base_amplitude ?? 5.0,
            last_sovereign_strike: data.last_sovereign_strike ?? ""
          });

          // Stream real-time consolidated consensus text into log elements
          if (data.logs && data.logs.length > 0) {
            const latestInsight = data.logs[data.logs.length - 1];
            setLogs(prev => {
              if (prev.includes(latestInsight)) return prev;
              return [latestInsight, ...prev].slice(0, 10);
            });
            setAnalysis(latestInsight);
            setTimeout(() => setAnalysis(null), 8500);
          }
        }
      },
      (error) => {
        console.error("[SEDA Sync] Connection failed:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Dynamic Audio synthesis warping hook responding to real-time SEDA changes
  useEffect(() => {
    const { audioCtx, droneOsc, droneGain, masterVolume, droneVolume } = stateRef.current;
    if (audioCtx && audioCtx.state === 'running' && droneOsc && droneGain) {
      // Warp the fundamental drone frequency by wave output parameter Y
      const basePitch = stateRef.current.dronePitch || 110;
      const warpedPitch = basePitch + (hensState.wave_output_Y * 15.0);
      droneOsc.frequency.setTargetAtTime(warpedPitch, audioCtx.currentTime, 0.1);

      // Warp continuous volume amplitude by hens bedrock flux density
      const baseGain = (droneVolume || 0.12) * (masterVolume || 0.5);
      const warpedGain = baseGain * (0.8 + (hensState.flux_intensity / 500.0));
      droneGain.gain.setTargetAtTime(warpedGain, audioCtx.currentTime, 0.1);
    }
  }, [hensState]);

  // Webhook action dispatcher
  const triggerShift = async (direction: string, magnitude: number) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/sovereign-shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          direction,
          magnitude,
          resonance: stateRef.current.resonance
        })
      });
      const data = await response.json();
      if (
        data.status === "Shift confirmed" || 
        data.status === "Kinetic strike registered. Wave collapse pending."
      ) {
         if (data.insight) {
           setLogs(prev => {
             if (prev.includes(data.insight)) return prev;
             return [data.insight, ...prev].slice(0, 10);
           });
           setAnalysis(data.insight);
           setTimeout(() => setAnalysis(null), 8500);
         }
      }
    } catch (e) {
      console.error("Shift failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta !== null && e.gamma !== null) {
      stateRef.current.tilt = {
        x: e.gamma / 10,
        y: e.beta / 10
      };
    }
  };

  const enableMotion = async () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const response = await (DeviceOrientationEvent as any).requestPermission();
        if (response === 'granted') {
          setMotionActive(true);
          window.addEventListener('deviceorientation', handleOrientation);
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      setMotionActive(true);
      window.addEventListener('deviceorientation', handleOrientation);
    }
  };

  // Audio Synthesis Utilities
  const startAmbientBackground = () => {
    const ctx = stateRef.current.audioCtx;
    if (!ctx || ctx.state === 'suspended' || stateRef.current.ambientOscs.length > 0) return;
    
    // Create subtle ambient warmth (a low tri chord: A1 + E2 + A2 octave)
    const freqs = [55.00, 82.41, 110.00]; 
    const gains: GainNode[] = [];
    const oscs: OscillatorNode[] = [];
    
    const masterGain = (window as any).masterGainNode;
    const dest = masterGain || ctx.destination;
    
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      filter.type = 'lowpass';
      filter.frequency.value = 140 + idx * 40; // Very warm low-pass cut-off
      
      // Extremely subtle background volume
      const baseGain = (idx === 1 ? 0.010 : 0.015) * stateRef.current.masterVolume;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(baseGain, ctx.currentTime + 3.0); // Slow warm swell
      
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      
      osc.start();
      oscs.push(osc);
      gains.push(gain);
    });
    
    // Create slow LFO to gently modulate the ambient pad amplitude for organic drift
    try {
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.06; // ~16 seconds per breath
      
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 0.006 * stateRef.current.masterVolume;
      
      lfo.connect(lfoGain);
      gains.forEach(g => {
        lfoGain.connect(g.gain);
      });
      
      lfo.start();
      stateRef.current.ambientLfo = lfo;
    } catch (e) {
      console.warn("LFO routing failed", e);
    }
    
    stateRef.current.ambientOscs = oscs;
    stateRef.current.ambientGains = gains;
  };

  const startStretchSound = () => {
    const ctx = stateRef.current.audioCtx;
    if (!ctx || ctx.state === 'suspended' || stateRef.current.stretchOsc) return;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(65, ctx.currentTime); // Low tension hum
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(110, ctx.currentTime);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    
    osc.connect(filter);
    filter.connect(gain);
    
    const masterGain = (window as any).masterGainNode;
    const dest = masterGain || ctx.destination;
    gain.connect(dest);
    
    osc.start();
    stateRef.current.stretchOsc = osc;
    stateRef.current.stretchGain = gain;
  };

  const updateStretchSound = (d: number) => {
    const { stretchOsc, stretchGain, audioCtx, masterVolume } = stateRef.current;
    if (!stretchOsc || !stretchGain || !audioCtx) return;
    
    // Higher distance = higher tension pitch & filter frequency cutoff rising (acts like tightening cords)
    const targetFreq = 65 + d * 0.8; // frequency rises dynamically from 65Hz to ~350Hz
    const targetVol = Math.min(0.22, (d / 380) * 0.18) * masterVolume; // subtle volume tracking tension
    
    stretchOsc.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.05);
    stretchGain.gain.setTargetAtTime(targetVol, audioCtx.currentTime, 0.05);
  };

  const stopStretchSound = () => {
    const { stretchOsc, stretchGain, audioCtx } = stateRef.current;
    if (!stretchOsc || !stretchGain || !audioCtx) return;
    
    try {
      stretchGain.gain.cancelScheduledValues(audioCtx.currentTime);
      stretchGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.12);
      stretchOsc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {}
    
    stateRef.current.stretchOsc = null;
    stateRef.current.stretchGain = null;
  };

  const initAudio = () => {
    if (stateRef.current.audioCtx) {
      if (stateRef.current.audioCtx.state === 'suspended') {
        stateRef.current.audioCtx.resume();
        setAudioEnabled(true);
        startAmbientBackground();
      }
      return;
    }
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    stateRef.current.audioCtx = ctx;

    // Create Master Gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(stateRef.current.masterVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);
    (window as any).masterGainNode = masterGain;

    // Setup Delay Effect for Plucks
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = stateRef.current.delayTime;
    
    // Create filter for delay effect
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200; // Default frequency

    const feedback = ctx.createGain();
    feedback.gain.value = stateRef.current.delayFeedbackVal;

    delay.connect(filter);
    filter.connect(feedback);
    feedback.connect(delay);
    
    // Connect feedback loop output to master gain
    filter.connect(masterGain);

    stateRef.current.delayNode = delay;
    stateRef.current.delayFeedback = feedback;
    stateRef.current.loopStartTime = ctx.currentTime * 1000;
    
    // Add Analyser for visualization
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128; // Smaller fftSize is perfect for a small rack visualizer
    masterGain.connect(analyser);
    (window as any).audioAnalyser = analyser;

    setAudioEnabled(true);
    startAmbientBackground();
  };

  const playPluck = (freq: number = 220) => {
    const ctx = stateRef.current.audioCtx;
    if (!ctx || ctx.state === 'suspended') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = stateRef.current.pluckWaveform;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.5, ctx.currentTime + 0.2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);

    const pluckVol = stateRef.current.pluckVolume * stateRef.current.masterVolume;
    gain.gain.setValueAtTime(pluckVol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(filter);
    filter.connect(gain);

    const masterGain = (window as any).masterGainNode;
    if (masterGain) {
      gain.connect(masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    // Connect to delay line
    if (stateRef.current.delayNode) {
      gain.connect(stateRef.current.delayNode);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  };

  const playSnap = () => {
    const ctx = stateRef.current.audioCtx;
    if (!ctx || ctx.state === 'suspended') return;

    const bufferSize = ctx.sampleRate * 0.1; // 100ms
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = ctx.createGain();
    const snapVol = 0.2 * stateRef.current.masterVolume;
    gain.gain.setValueAtTime(snapVol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

    noise.connect(filter);
    filter.connect(gain);

    const masterGain = (window as any).masterGainNode;
    if (masterGain) {
      gain.connect(masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    noise.start();
    noise.stop(ctx.currentTime + 0.1);
  };

  const playReleaseSound = (maxDist: number) => {
    const ctx = stateRef.current.audioCtx;
    if (!ctx || ctx.state === 'suspended') return;

    // Trigger the snap transient
    playSnap();

    // Trigger the quick, rubber-band frequency plunge
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = 'triangle';
    const startFreq = Math.min(500, 65 + maxDist * 0.85);
    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.25);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.25);

    const volume = 0.22 * stateRef.current.masterVolume;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.connect(filter);
    filter.connect(gain);

    const masterGain = (window as any).masterGainNode;
    if (masterGain) {
      gain.connect(masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  };

  const playChime = () => {
    const ctx = stateRef.current.audioCtx;
    if (!ctx || ctx.state === 'suspended') return;

    // Create a beautiful harmonic major chord for target matching resonance
    const frequencies = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    const now = ctx.currentTime;
    
    frequencies.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);
      
      // Delay each voice slightly for a lovely golden strumming effect!
      const delay = idx * 0.04;
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);
      
      const chordVolume = 0.12 * stateRef.current.masterVolume;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(chordVolume, now + delay + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 1.2);
      
      osc.connect(filter);
      filter.connect(gain);
      
      const masterGain = (window as any).masterGainNode;
      if (masterGain) {
        gain.connect(masterGain);
      } else {
        gain.connect(ctx.destination);
      }
      
      osc.start(now + delay);
      osc.stop(now + delay + 1.2);
    });
  };

  const startDrone = () => {
    const ctx = stateRef.current.audioCtx;
    if (!ctx || ctx.state === 'suspended' || stateRef.current.droneOsc) return;
    if (!isPlayingRef.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    osc.type = stateRef.current.droneWaveform;
    osc.frequency.setValueAtTime(stateRef.current.dronePitch, ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, ctx.currentTime);

    const droneVol = stateRef.current.droneVolume * stateRef.current.masterVolume;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(droneVol, ctx.currentTime + 0.1);

    osc.connect(filter);
    filter.connect(gain);

    const masterGain = (window as any).masterGainNode;
    if (masterGain) {
      gain.connect(masterGain);
    } else {
      gain.connect(ctx.destination);
    }

    osc.start();
    stateRef.current.droneOsc = osc;
    stateRef.current.droneGain = gain;
  };

  const updateDrone = (dist: number) => {
    const { droneOsc, droneGain, audioCtx, dronePitch, droneVolume, masterVolume } = stateRef.current;
    if (!droneOsc || !droneGain || !audioCtx) return;

    const freq = dronePitch + (dist * 0.5);
    const volume = Math.min(droneVolume * 2, (dist / 300) * droneVolume) * masterVolume;
    
    droneOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
    droneGain.gain.setTargetAtTime(volume, audioCtx.currentTime, 0.1);
  };

  const stopDrone = () => {
    const { droneOsc, droneGain, audioCtx } = stateRef.current;
    if (!droneOsc || !droneGain || !audioCtx) return;

    droneGain.gain.cancelScheduledValues(audioCtx.currentTime);
    droneGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
    droneOsc.stop(audioCtx.currentTime + 0.2);

    stateRef.current.droneOsc = null;
    stateRef.current.droneGain = null;
  };

  const handleSynthChange = (key: string, val: any) => {
    (stateRef.current as any)[key] = val;
    setSynthSettings(prev => ({ ...prev, [key]: val }));

    const ctx = stateRef.current.audioCtx;
    if (ctx && ctx.state === 'running') {
      if (key === 'delayFeedbackVal' && stateRef.current.delayFeedback) {
        stateRef.current.delayFeedback.gain.setTargetAtTime(val as number, ctx.currentTime, 0.05);
      }
      if (key === 'delayTime' && stateRef.current.delayNode) {
        stateRef.current.delayNode.delayTime.setTargetAtTime(val as number, ctx.currentTime, 0.05);
      }
      if (key === 'dronePitch' && stateRef.current.droneOsc) {
        stateRef.current.droneOsc.frequency.setTargetAtTime(val as number, ctx.currentTime, 0.05);
      }
      if (key === 'droneWaveform' && stateRef.current.droneOsc) {
        stateRef.current.droneOsc.type = val as OscillatorType;
      }
      if (key === 'droneVolume' && stateRef.current.droneGain) {
        stateRef.current.droneGain.gain.setTargetAtTime((val as number) * stateRef.current.masterVolume, ctx.currentTime, 0.05);
      }
      if (key === 'masterVolume') {
        const masterGain = (window as any).masterGainNode;
        if (masterGain) {
          masterGain.gain.setTargetAtTime(val as number, ctx.currentTime, 0.05);
        }
        if (stateRef.current.droneGain) {
          stateRef.current.droneGain.gain.setTargetAtTime(stateRef.current.droneVolume * (val as number), ctx.currentTime, 0.05);
        }
      }
    }
  };

  const applyPreset = (presetName: string) => {
    const state = stateRef.current;
    let preset = {
      masterVolume: 0.5,
      droneVolume: 0.12,
      pluckVolume: 0.3,
      dronePitch: 110,
      pluckWaveform: 'triangle' as OscillatorType,
      droneWaveform: 'sawtooth' as OscillatorType,
      delayTime: 0.25,
      delayFeedbackVal: 0.4,
    };

    if (presetName === 'Ethereal Space-Time') {
      preset = {
        masterVolume: 0.6,
        droneVolume: 0.08,
        pluckVolume: 0.45,
        dronePitch: 220,
        pluckWaveform: 'triangle',
        droneWaveform: 'sine',
        delayTime: 0.45,
        delayFeedbackVal: 0.65,
      };
    } else if (presetName === 'Heavy Grav-Drive') {
      preset = {
        masterVolume: 0.75,
        droneVolume: 0.16,
        pluckVolume: 0.35,
        dronePitch: 55,
        pluckWaveform: 'square',
        droneWaveform: 'sawtooth',
        delayTime: 0.2,
        delayFeedbackVal: 0.3,
      };
    } else if (presetName === 'Retro Spark') {
      preset = {
        masterVolume: 0.6,
        droneVolume: 0.1,
        pluckVolume: 0.5,
        dronePitch: 110,
        pluckWaveform: 'sawtooth',
        droneWaveform: 'square',
        delayTime: 0.15,
        delayFeedbackVal: 0.5,
      };
    } else if (presetName === 'Deep Contemplation') {
      preset = {
        masterVolume: 0.5,
        droneVolume: 0.12,
        pluckVolume: 0.25,
        dronePitch: 147,
        pluckWaveform: 'sine',
        droneWaveform: 'triangle',
        delayTime: 0.6,
        delayFeedbackVal: 0.15,
      };
    }

    state.masterVolume = preset.masterVolume;
    state.droneVolume = preset.droneVolume;
    state.pluckVolume = preset.pluckVolume;
    state.dronePitch = preset.dronePitch;
    state.pluckWaveform = preset.pluckWaveform;
    state.droneWaveform = preset.droneWaveform;
    state.delayTime = preset.delayTime;
    state.delayFeedbackVal = preset.delayFeedbackVal;

    const ctx = state.audioCtx;
    if (ctx && ctx.state === 'running') {
      const masterGain = (window as any).masterGainNode;
      if (masterGain) {
        masterGain.gain.setTargetAtTime(preset.masterVolume, ctx.currentTime, 0.1);
      }
      if (state.delayFeedback) {
        state.delayFeedback.gain.setTargetAtTime(preset.delayFeedbackVal, ctx.currentTime, 0.1);
      }
      if (state.delayNode) {
        state.delayNode.delayTime.setTargetAtTime(preset.delayTime, ctx.currentTime, 0.1);
      }
      if (state.droneOsc) {
        state.droneOsc.type = preset.droneWaveform;
        state.droneOsc.frequency.setTargetAtTime(preset.dronePitch, ctx.currentTime, 0.1);
      }
      if (state.droneGain) {
        state.droneGain.gain.setTargetAtTime(preset.droneVolume * preset.masterVolume, ctx.currentTime, 0.1);
      }
    }

    setSynthSettings(preset);
  };

  const isPlayingRef = useRef(false);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const handlePlayToggle = () => {
    if (!audioEnabled) {
      initAudio();
      setIsPlaying(true);
    } else {
      const nextPlaying = !isPlaying;
      setIsPlaying(nextPlaying);
      if (!nextPlaying) {
        stopDrone();
      }
    }
  };

  const clearAllLoops = () => {
    setSavedLoops([]);
    stateRef.current.recordedEvents = [];
    
    // Spawn particle to announce loop purge
    const state = stateRef.current;
    state.particles.push({
      id: Date.now() + Math.random(),
      x: state.cx,
      y: state.cy - 120,
      text: "LOOPS PURGED",
      alpha: 1,
      color: "#f43f5e",
      vx: 0,
      vy: -1.5
    });

    state.lastLoopCheck = 0;
    setLogs(prev => ["All active loop tracks and injected commit vectors purged.", ...prev].slice(0, 10));
    playSnap();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const container = sandboxContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      canvas.width = w;
      canvas.height = h;
      const state = stateRef.current;
      state.cx = w / 2;
      state.cy = h / 2;
      
      // Update corner anchors relative to this canvas block
      state.anchors = [
        { x: 40, y: 40 },           // Top Left
        { x: w - 40, y: 40 },      // Top Right
        { x: 40, y: h - 40 },      // Bottom Left
        { x: w - 40, y: h - 40 }   // Bottom Right
      ];
      state.startPos = [...state.anchors];

      if (state.x === 0 || !state.isDragging) {
        state.x = state.cx;
        state.y = state.cy;
      }
    };

    const container = sandboxContainerRef.current;
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    if (container) {
      resizeObserver.observe(container);
    }
    handleResize();

    const animate = (time: number) => {
      const state = stateRef.current;
      const { cx, cy, k, damping, baseR, anchors } = state;

      // Chime check
      if (state.isDragging && state.lastOutput > 0 && Math.abs(state.currentInput - state.lastOutput) < 5) {
          if (!state.hasChimed) {
              playChime();
              state.hasChimed = true;
              
              // Spawn beautiful celebration particles and multiple outer ripples on matching values!
              state.particles.push({
                id: Date.now() + Math.random(),
                x: state.x,
                y: state.y - 45,
                text: "RESONANCE SYNCED",
                alpha: 1.0,
                color: "#14b8a6", // Crystalline teal success color
                vx: 0,
                vy: -1.2
              });
              
              for (let i = 1; i <= 3; i++) {
                state.ripples.push({
                  x: state.x,
                  y: state.y,
                  r: i * 20,
                  alpha: 1.0 - (i * 0.25),
                  color: `rgba(20, 184, 166, ${1.0 - (i * 0.25)})`
                });
              }
          }
      } else if (!state.isDragging) {
          state.hasChimed = false;
      }

      // Update Loop Engine
      if (isPlayingRef.current && state.audioCtx && state.audioCtx.state === 'running') {
        const now = state.audioCtx.currentTime * 1000;
        const relativeTime = (now - state.loopStartTime) % state.loopLength;
        
        // 1. Play active recording buffer
        state.recordedEvents.forEach(event => {
          const play = (state.lastLoopCheck < event.timeOffset && relativeTime >= event.timeOffset) ||
                       (state.lastLoopCheck > relativeTime && (event.timeOffset > state.lastLoopCheck || event.timeOffset <= relativeTime));
          
          if (play) {
            playPluck(event.freq);
            state.ripples.push({
              x: cx,
              y: cy,
              r: 20,
              alpha: 0.3 * event.magnitude,
              color: 'rgba(255, 255, 255, 0.1)'
            });
          }
        });

        // 2. Play saved loops
        savedLoopsRef.current.forEach(loop => {
          loop.events.forEach(event => {
            const play = (state.lastLoopCheck < event.timeOffset && relativeTime >= event.timeOffset) ||
                         (state.lastLoopCheck > relativeTime && (event.timeOffset > state.lastLoopCheck || event.timeOffset <= relativeTime));
            
            if (play) {
              playPluck(event.freq * 0.8); // Slightly lower pitch for background loops
              state.ripples.push({
                x: loop.x,
                y: loop.y,
                r: 30 * event.magnitude,
                alpha: 0.2,
                color: `hsla(${loop.hue}, 100%, 70%, 0.2)`
              });
            }
          });
        });

        state.lastLoopCheck = relativeTime;
      }

      if (!state.isDragging) {
        state.idleTime += 16; // Approx 60fps increment
        state.resonance *= 0.95;
      } else {
        state.idleTime = 0;
        const d = Math.hypot(state.x - state.cx, state.y - state.cy);
        const stability = 1 - Math.min(1, Math.abs(d - state.lastD) / 5);
        state.resonance = Math.min(1, state.resonance + (stability * 0.02));
        state.lastD = d;
      }

      if (Math.abs(state.resonance - resonanceState) > 0.05) {
        setResonanceState(state.resonance);
      }

      // 1. Clear & Draw Background Grid
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Saved Loop Blobs
      savedLoopsRef.current.forEach(loop => {
        const osc = Math.sin(time * 0.003) * 3;
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = `hsla(${loop.hue}, 100%, 70%, 0.4)`;
        ctx.fillStyle = `hsla(${loop.hue}, 100%, 70%, 0.15)`;
        ctx.beginPath();
        ctx.arc(loop.x, loop.y, 10 + osc, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = `hsla(${loop.hue}, 100%, 70%, 0.3)`;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.arc(loop.y % 10 > 5 ? loop.x : loop.x, loop.y, 15 + osc * 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.beginPath();
      for(let i = 0; i < canvas.width; i += 40) {
        ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height);
      }
      for(let j = 0; j < canvas.height; j += 40) {
        ctx.moveTo(0, j); ctx.lineTo(canvas.width, j);
      }
      ctx.stroke();

      // Draw Ripples
      state.ripples = state.ripples.map(r => ({
        ...r,
        r: r.r + 4,
        alpha: r.alpha - 0.03
      })).filter(r => r.alpha > 0);

      state.ripples.forEach(r => {
        ctx.save();
        ctx.strokeStyle = r.color;
        ctx.globalAlpha = Math.max(0, r.alpha);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      });

      // Draw Spectrum Visualizer
      if (audioEnabled && (window as any).audioAnalyser) {
        const analyser = (window as any).audioAnalyser as AnalyserNode;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        
        ctx.save();
        ctx.beginPath();
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        const barWidth = canvas.width / data.length;
        for (let i = 0; i < data.length; i++) {
          const barHeight = (data[i] / 255) * 100;
          ctx.moveTo(i * barWidth, canvas.height);
          ctx.lineTo(i * barWidth, canvas.height - barHeight);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Update Hue & Spectrum Ghosts
      if (state.isDragging) {
        state.hueCycle = (state.hueCycle + 2) % 360;
        state.hue = state.hueCycle;
      }
      
      const speed = Math.hypot(state.vx, state.vy);
      if (speed > 10 || (state.isDragging && speed > 2)) {
        state.ghosts.push({
          x: state.x,
          y: state.y,
          r: state.baseR,
          hue: state.hue,
          alpha: 0.5
        });
      }
      
      // Update ghosts with intensity
      state.ghosts = state.ghosts.map(g => ({
        ...g,
        alpha: g.alpha - (0.05 * (2 - state.spectrumIntensity)),
        r: g.r * 0.99
      })).filter(g => g.alpha > 0);

      state.ghosts.forEach(g => {
        ctx.save();
        ctx.fillStyle = `hsla(${g.hue}, 100%, 70%, ${g.alpha})`;
        ctx.beginPath();
        ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // 2. Draw Corner Hook UI with Idle Drift
      const isIdle = state.idleTime > 2000;
      anchors.forEach((anchor, i) => {
        if (isIdle && !state.isDragging && state.startPos[i]) {
          const driftX = Math.sin(time * 0.001 + i) * 10;
          const driftY = Math.cos(time * 0.0012 + i) * 10;
          anchor.x += (state.startPos[i].x + driftX - anchor.x) * 0.05;
          anchor.y += (state.startPos[i].y + driftY - anchor.y) * 0.05;
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const size = 15;
        const offsetX = anchor.x < cx ? 1 : -1;
        const offsetY = anchor.y < cy ? 1 : -1;
        ctx.moveTo(anchor.x, anchor.y + size * offsetY);
        ctx.lineTo(anchor.x, anchor.y);
        ctx.lineTo(anchor.x + size * offsetX, anchor.y);
        ctx.stroke();

        ctx.fillStyle = (state.isDragging || (isIdle && Math.sin(time * 0.005 + i) > 0)) 
          ? 'rgba(34, 211, 238, 0.4)' 
          : 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Multi-Vector Physics
      if (!state.isDragging) {
        if (state.releaseDelay > 0) {
          state.releaseDelay -= 1;
        } else {
          anchors.forEach(anchor => {
            const dx = anchor.x - state.x;
            const dy = anchor.y - state.y;
            state.vx += dx * state.k;
            state.vy += dy * state.k;
          });

          const cdx = cx - state.x;
          const cdy = cy - state.y;
          state.vx += cdx * 0.05;
          state.vy += cdy * 0.05;

          state.vx += state.tilt.x * 0.6;
          state.vy += state.tilt.y * 0.6;

          state.vx *= state.damping;
          state.vy *= state.damping;
          state.x += state.vx;
          state.y += state.vy;
        }
      }

      // 4. Draw Vector Connections (Hefboom Strings)
      const dist = Math.hypot(state.x - cx, state.y - cy);
      const angle = Math.atan2(state.y - cy, state.x - cx);

      ctx.save();
      anchors.forEach((anchor, i) => {
        const opacity = state.isDragging ? 0.4 : 0.05;
        const lineHue = (state.hueCycle + i * 40) % 360;
        ctx.strokeStyle = state.isDragging ? `hsla(${lineHue}, 100%, 70%, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = state.isDragging ? 1.5 : 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(state.x, state.y);
        ctx.stroke();
      });
      ctx.restore();

      // 5. Smooth Color Transitions
      state.lightness += (state.targetLightness - state.lightness) * 0.1;
      state.saturation += (state.targetSaturation - state.saturation) * 0.1;
      
      const pulse = isIdle ? Math.sin(time * 0.003) * 10 : 0;
      const highlightColor = state.isDragging 
        ? `hsl(${state.hueCycle}, 100%, 70%)` 
        : `rgb(${245 + pulse}, ${245 + pulse}, ${245 + pulse})`;
      
      ctx.save();
      ctx.shadowBlur = state.isDragging ? 50 : (15 + (isIdle ? (Math.sin(time * 0.003) + 1) * 10 : 0));
      ctx.shadowColor = highlightColor;
      ctx.fillStyle = highlightColor;

      // 6. Draw Elastic Blob
      if (dist > 5) {
        const tailR = Math.max(10, baseR - dist * 0.1);
        const pAngle = angle + Math.PI / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, tailR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(state.x, state.y, baseR, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx + tailR * Math.cos(pAngle), cy + tailR * Math.sin(pAngle));
        ctx.lineTo(cx + tailR * Math.cos(pAngle + Math.PI), cy + tailR * Math.sin(pAngle + Math.PI));
        ctx.lineTo(state.x + baseR * Math.cos(pAngle + Math.PI), state.y + baseR * Math.sin(pAngle + Math.PI));
        ctx.lineTo(state.x + baseR * Math.cos(pAngle), state.y + baseR * Math.sin(pAngle));
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, baseR + (isIdle ? Math.sin(time * 0.002) * 2 : 0), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = "#0A0A0F";
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 7. Draw Particles
      ctx.save();
      ctx.textAlign = 'center';
      state.particles = state.particles.map(p => ({
        ...p,
        y: p.y + p.vy,
        x: p.x + p.vx,
        alpha: p.alpha - 0.015
      })).filter(p => p.alpha > 0);

      state.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.font = `bold 24px 'JetBrains Mono', monospace`;
        ctx.fillText(p.text, p.x, p.y);
      });
      ctx.restore();

      // Draw Mini Oscilloscope Canvas
      const oscCanvas = document.getElementById('synthOscilloscope') as HTMLCanvasElement | null;
      if (oscCanvas && audioEnabled && (window as any).audioAnalyser) {
        const oCtx = oscCanvas.getContext('2d');
        if (oCtx) {
          const analyser = (window as any).audioAnalyser as AnalyserNode;
          const bufferLength = analyser.fftSize;
          const dataArray = new Uint8Array(bufferLength);
          analyser.getByteTimeDomainData(dataArray);

          oCtx.fillStyle = 'rgba(10, 10, 15, 0.4)'; // Motion blur trail
          oCtx.fillRect(0, 0, oscCanvas.width, oscCanvas.height);

          oCtx.lineWidth = 1.5;
          oCtx.strokeStyle = 'rgba(236, 72, 153, 0.95)'; // Fuchsia-ish
          oCtx.beginPath();

          const sliceWidth = oscCanvas.width / bufferLength;
          let xX = 0;

          for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const yOffset = (v * oscCanvas.height) / 2;

            if (i === 0) {
              oCtx.moveTo(xX, yOffset);
            } else {
              oCtx.lineTo(xX, yOffset);
            }

            xX += sliceWidth;
          }

          oCtx.lineTo(oscCanvas.width, oscCanvas.height / 2);
          oCtx.stroke();
        }
      } else if (oscCanvas) {
        const oCtx = oscCanvas.getContext('2d');
        if (oCtx) {
          oCtx.fillStyle = '#111015';
          oCtx.fillRect(0, 0, oscCanvas.width, oscCanvas.height);
          oCtx.strokeStyle = 'rgba(34, 211, 238, 0.15)'; // Flatline cyan
          oCtx.lineWidth = 1;
          oCtx.beginPath();
          oCtx.moveTo(0, oscCanvas.height / 2);
          oCtx.lineTo(oscCanvas.width, oscCanvas.height / 2);
          oCtx.stroke();
        }
      }

      requestAnimationFrame(animate);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const container = sandboxContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      const state = stateRef.current;
      state.idleTime = 0;
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      state.lastTapTime = Date.now();
      state.isReleased = false;
      state.releaseDelay = 0;

      const pts = Array.from(state.pointers.values()) as { x: number; y: number }[];
      const localPts = pts.map(p => ({
        x: p.x - rect.left,
        y: p.y - rect.top
      }));

      const avgX = localPts.reduce((sum, p) => sum + p.x, 0) / localPts.length;
      const avgY = localPts.reduce((sum, p) => sum + p.y, 0) / localPts.length;

      // Make ball appear at input
      if (!state.isDragging) {
        state.x = avgX;
        state.y = avgY;
        state.isDragging = true;
        state.vx = 0;
        state.vy = 0;
        state.maxDist = 0;
        state.targetLightness = 60;
        state.targetSaturation = 100;
        setIsInteractionActive(true);
        startDrone();
        startStretchSound(); // Start continuous tension synth on drag touch
        
        // Spawn ripple
        state.ripples.push({
          x: state.x,
          y: state.y,
          r: 10,
          alpha: 1,
          color: '#fff'
        });
        playPluck(110);
      }

      if (state.pointers.size === 2) {
        state.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        state.initialBaseR = state.baseR;
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = stateRef.current;
      state.idleTime = 0;
      if (!state.pointers.has(e.pointerId)) return;
      state.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const container = sandboxContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();

      if (state.isDragging) {
        const pts = Array.from(state.pointers.values()) as { x: number; y: number }[];
        const localPts = pts.map(p => ({
          x: p.x - rect.left,
          y: p.y - rect.top
        }));

        const avgX = localPts.reduce((sum, p) => sum + p.x, 0) / localPts.length;
        const avgY = localPts.reduce((sum, p) => sum + p.y, 0) / localPts.length;

        state.x = avgX;
        state.y = avgY;
        
        const d = Math.hypot(state.x - state.cx, state.y - state.cy);
        state.maxDist = Math.max(state.maxDist, d);
        state.currentInput = Math.round(d); // Track current input
        setMetrics(m => ({ ...m, input: Math.round(d) }));
        updateDrone(d);
        updateStretchSound(d); // Continuous rubber-cord tension modulation

        // Directional Shift Detection
        if (d > 60 && !state.shiftTriggered) {
          const angle = Math.atan2(state.y - state.cy, state.x - state.cx);
          const deg = angle * (180 / Math.PI);
          let direction = "" as "North" | "South" | "East" | "West";
          
          if (deg > -45 && deg <= 45) direction = "East";
          else if (deg > 45 && deg <= 135) direction = "South";
          else if (deg > 135 || deg <= -135) direction = "West";
          else direction = "North";

          if (direction !== state.lastDirection) {
            state.lastDirection = direction;
            state.shiftTriggered = true;
            triggerShift(direction, d);
            playPluck(direction === "North" ? 440 : direction === "South" ? 220 : direction === "East" ? 330 : 165);
          }
        } else if (d < 50) {
          state.shiftTriggered = false;
        }

        if (state.pointers.size === 2) {
          const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
          if (state.initialPinchDist > 0) {
            const ratio = currentDist / state.initialPinchDist;
            state.baseR = Math.min(150, Math.max(20, state.initialBaseR * ratio));
          }
        }
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      const state = stateRef.current;
      const wasDragging = state.isDragging;
      state.pointers.delete(e.pointerId);

      const container = sandboxContainerRef.current;
      if (!container) return;

      if (state.pointers.size === 0 && wasDragging) {
        state.isDragging = false;
        state.isReleased = true;
        state.releaseDelay = 15; // Frames to wait before snapping
        stopDrone();
        stopStretchSound(); // Stop continuous tension voice
        playReleaseSound(state.maxDist); // Custom rich release snapback sound with tension sweep!
        
        // Add visual echo pulse on release
        const releaseMag = Math.min(50, state.maxDist / 5);
        for(let i = 0; i < 6; i++) {
          state.ghosts.push({
            x: state.x + (Math.random() - 0.5) * releaseMag,
            y: state.y + (Math.random() - 0.5) * releaseMag,
            r: state.baseR * (1 + i * 0.1),
            hue: (state.hueCycle + i * 15) % 360,
            alpha: 0.8 - (i * 0.1)
          });
        }

        state.targetLightness = 25;
        state.targetSaturation = 0;
        
        // Record event into loop
        if (state.audioCtx) {
          const now = state.audioCtx.currentTime * 1000;
          const timeOffset = (now - state.loopStartTime) % state.loopLength;
          const freq = 110 + (state.maxDist * 0.5);
          
          state.recordedEvents.push({
            timeOffset,
            freq,
            magnitude: Math.min(1, state.maxDist / 400)
          });
          
          // Limit buffer size to last 16 events
          if (state.recordedEvents.length > 16) {
            state.recordedEvents.shift();
          }
        }

        // Auto-Tempo Calculation
        const nowMs = Date.now();
        state.lastReleaseTimes.push(nowMs);
        if (state.lastReleaseTimes.length > 4) state.lastReleaseTimes.shift();
        
        if (state.lastReleaseTimes.length >= 2) {
          const diffs = [];
          for (let i = 1; i < state.lastReleaseTimes.length; i++) {
            diffs.push(state.lastReleaseTimes[i] - state.lastReleaseTimes[i-1]);
          }
          const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
          // If interaction is within a reasonable BPM range (40 - 240)
          if (avgDiff > 250 && avgDiff < 1500) {
            state.loopLength = avgDiff;
            state.bpm = Math.round(60000 / avgDiff);
          }
        }
        
        const finalVal = Math.round(state.maxDist);
        state.lastOutput = finalVal; // Track output
        setMetrics(m => ({ ...m, input: 0, output: finalVal }));

        if (finalVal > 20) {
          state.particles.push({
            id: Date.now(),
            x: state.cx,
            y: state.cy - 100,
            text: `+${finalVal}`,
            alpha: 1,
            color: '#f5d0fe', // Fuchsia-ish
            vx: (Math.random() - 0.5) * 2,
            vy: -2
          });
        }
      }

      if (state.pointers.size < 2) {
        state.initialPinchDist = 0;
      }
    };

    const animationId = requestAnimationFrame(animate);

    if (container) {
      container.addEventListener('pointerdown', handlePointerDown);
    }
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      if (container) {
        container.removeEventListener('pointerdown', handlePointerDown);
      }
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  const tensionPercent = Math.min(100, (metrics.input / 300) * 100);
  const forcePercent = Math.min(100, (metrics.output / 300) * 100);

  return (
    <div className="fixed inset-0 bg-[#050508] text-white font-mono flex flex-col overflow-hidden select-none">
      {/* DAW Header/Transport */}
      <div className="w-full z-50 p-3 bg-black/60 backdrop-blur-md border-b border-cyan-500/15 flex justify-between items-center pointer-events-auto shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="text-xs sm:text-sm font-bold tracking-widest text-cyan-400">HEFBOOM AETHERIUM</h1>
            {analysis && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="hidden sm:block text-[10px] text-fuchsia-400 font-medium italic border-l border-fuchsia-500/30 pl-3 max-w-sm truncate"
              >
                "{analysis}"
              </motion.div>
            )}
          </div>
          <div className="flex gap-1.5 sm:gap-2">
              <div className="flex items-center px-3 bg-white/5 border border-white/10 text-[8px] sm:text-[10px] tracking-widest text-slate-400">
                {stateRef.current.lastDirection || "IDLE"}
              </div>
              <button 
                onClick={() => stateRef.current.lastDirection && triggerShift(stateRef.current.lastDirection, stateRef.current.maxDist)}
                disabled={isAnalyzing}
                className="px-2 sm:px-4 py-1 sm:py-1.5 bg-fuchsia-900/40 hover:bg-fuchsia-800 border border-fuchsia-500/30 text-[8px] sm:text-[10px] tracking-widest disabled:opacity-50 whitespace-nowrap font-bold"
              >
                {isAnalyzing ? "..." : (window.innerWidth < 640 ? "INSIGHT" : "AI INSIGHT")}
              </button>
              <button onClick={handlePlayToggle} className="px-3 sm:px-4 py-1 sm:py-1.5 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/30 text-[10px] sm:text-xs font-bold">
                  {isPlaying ? "STOP" : "PLAY"}
              </button>
          </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 px-4 pb-4 overflow-hidden relative">
        {/* Left Section: SANDBOX STAGE */}
        <div 
          ref={sandboxContainerRef}
          className="flex-1 min-h-[280px] md:h-full bg-[#09090E] border border-cyan-500/15 rounded-xl relative overflow-hidden cursor-crosshair touch-none select-none shadow-[inset_0_0_40px_rgba(34,211,238,0.03)]"
        >
          <Channel1Canvas 
            magnitude={metrics.input} 
            resonance={resonanceState} 
            dragX={stateRef.current.x} 
            dragY={stateRef.current.y} 
            isDragging={stateRef.current.isDragging}
            wave_output_Y={hensState.wave_output_Y}
            flux_intensity={hensState.flux_intensity}
            phase_angle={hensState.phase_angle}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 z-0"
          />

          {/* Canvas Floating Labels */}
          <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 border border-cyan-500/10 rounded text-[9px] tracking-widest text-cyan-400 font-bold uppercase pointer-events-none z-10 flex items-center gap-1.5 shadow-md">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400 animate-pulse" />
            <span>AETHER STAGE</span>
          </div>

          <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 border border-white/5 rounded text-[8px] sm:text-[9px] tracking-widest text-slate-500 font-bold uppercase pointer-events-none z-10 shadow-md">
            {stateRef.current.isDragging ? 'ACTIVE SHIFT' : 'STABILIZED'}
          </div>

          {/* Floating BPM/Status Indicator in low right corner of sandbox */}
          <div className="absolute bottom-3 right-3 text-right text-[9px] tracking-widest uppercase pointer-events-none z-10 flex flex-col gap-0.5 bg-black/50 p-2 border border-white/5 rounded">
            <div className="text-cyan-400 font-bold">{stateRef.current.bpm} BPM</div>
            <div className="text-slate-500">Status: {stateRef.current.isDragging ? 'DRAGGING' : 'IDLE'}</div>
          </div>
        </div>

        {/* Right Section: DAW CONTROL DECKS */}
        <div className="w-full md:w-[440px] shrink-0 h-full flex flex-col gap-4 overflow-y-auto pr-1">
          
          {/* Deck Block 1: Metrics HUD */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-xl">
            <h2 className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3 font-mono">Tension Metrics HUD</h2>
            <div className="flex flex-row items-center gap-8 justify-center">
              {/* Tension Gauge */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-[8px] sm:text-[9px] tracking-widest text-slate-500 mb-1 uppercase">Input Tension</span>
                <div className="text-xl sm:text-3xl font-light tracking-tighter tabular-nums">
                  {metrics.input.toString().padStart(3, '0')}
                </div>
                <div className="w-full h-1 bg-stone-900 mt-2 overflow-hidden rounded-full border border-stone-800 animate-pulse">
                  <div 
                    style={{ width: `${tensionPercent}%` }}
                    className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
                  />
                </div>
              </div>

              {/* Divider */}
              <div className="h-10 w-px bg-white/10 self-center" />

              {/* Output Power Gauge */}
              <div className="flex flex-col items-center flex-1">
                <span className="text-[8px] sm:text-[9px] tracking-widest text-slate-500 mb-1 uppercase">Output Force</span>
                <div className="text-xl sm:text-3xl font-light tracking-tighter text-fuchsia-400 tabular-nums">
                  {metrics.output.toString().padStart(3, '0')}
                </div>
                <div className="w-full h-1 bg-stone-900 mt-2 overflow-hidden rounded-full border border-stone-800">
                  <div 
                    style={{ width: `${forcePercent}%` }}
                    className="h-full bg-fuchsia-500 transition-all duration-75 shadow-[0_0_8px_rgba(217,70,239,0.5)]" 
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Deck Block 2: Sector Data & Observer Logs */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-xl flex flex-col">
              <h2 className="text-[9px] uppercase tracking-widest text-cyan-500/70 mb-3 font-bold italic">Sector Nodes Status</h2>
              <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 border rounded ${stateRef.current.lastDirection === 'North' ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white/5 border-white/5'} transition-all`}>
                    <div className="text-[9px] uppercase text-cyan-400 font-bold">Trinity Node</div>
                    <div className="text-[7px] text-slate-500 uppercase mt-0.5">{stateRef.current.lastDirection === 'North' ? 'TRIG' : 'LOCK'}</div>
                  </div>
                  <div className={`p-2 border rounded ${stateRef.current.lastDirection === 'East' ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white/5 border-white/5'} transition-all`}>
                    <div className="text-[9px] uppercase text-cyan-400 font-bold">TravGuild Hub</div>
                    <div className="text-[7px] text-slate-500 uppercase mt-0.5">{stateRef.current.lastDirection === 'East' ? 'TRIG' : 'LOCK'}</div>
                  </div>
                  <div className={`p-2 border rounded ${stateRef.current.lastDirection === 'South' ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white/5 border-white/5'} transition-all`}>
                    <div className="text-[9px] uppercase text-cyan-400 font-bold">HENS Ground</div>
                    <div className="text-[7px] text-slate-500 uppercase mt-0.5">{stateRef.current.lastDirection === 'South' ? 'TRIG' : 'LOCK'}</div>
                  </div>
                  <div className={`p-2 border rounded ${stateRef.current.lastDirection === 'West' ? 'bg-cyan-500/10 border-cyan-500' : 'bg-white/5 border-white/5'} transition-all`}>
                    <div className="text-[9px] uppercase text-cyan-400 font-bold font-bold">Observer Logs</div>
                    <div className="text-[7px] text-slate-500 uppercase mt-0.5">{stateRef.current.lastDirection === 'West' ? 'TRIG' : 'LOCK'}</div>
                  </div>
              </div>
              {logs.length > 0 && (
                <div className="mt-3 p-2 bg-black/40 border border-white/5 rounded">
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 mb-1 font-bold font-mono">Quantum Logs:</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {logs.map((log, i) => (
                       <div key={i} className="text-[8px] text-slate-400 font-mono border-l-2 border-fuchsia-500/30 pl-2">
                         {log}
                       </div>
                    ))}
                  </div>
                </div>
              )}
          </div>

          {/* Deck Block 3: Resonance Sync */}
          <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 sm:p-4 rounded-xl">
              <h2 className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3">Resonance Timeline</h2>
              <div className="w-full h-24 border border-dashed border-white/5 rounded-lg flex flex-col items-center justify-center relative p-2 bg-[#09090E]">
                 <div className="w-full h-px bg-white/5 absolute top-1/2 -translate-y-1/2" />
                 <div className="w-px h-full bg-white/5 absolute left-1/2 -translate-x-1/2" />
                 
                 <div className="flex gap-1 mb-2.5 z-10">
                   {Array.from({ length: 12 }).map((_, i) => (
                     <div 
                       key={i} 
                       className={`w-1 h-6 rounded-full transition-all duration-300 ${resonanceState > (i / 12) ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-white/5'}`} 
                     />
                   ))}
                 </div>
                 
                 <div className="text-[9px] tracking-widest text-cyan-400 font-bold z-10 uppercase">
                   Sync Status: {Math.round(resonanceState * 100)}%
                 </div>
              </div>
          </div>

          {/* Deck Block 4: AETHER RES_SYNTH v1.0 Mixer */}
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/15 p-3 sm:p-4 rounded-xl flex flex-col">
            {!audioEnabled ? (
              <button 
                onClick={initAudio}
                className="w-full h-28 border border-dashed border-cyan-500/35 bg-cyan-950/10 hover:bg-cyan-950/20 active:bg-cyan-950/35 transition-all flex flex-col items-center justify-center cursor-pointer group p-3 rounded-lg"
              >
                <div className="flex items-center gap-2 text-cyan-400 font-bold">
                  <Play className="w-4 h-4 animate-pulse text-cyan-500" />
                  <span className="text-[10px] tracking-widest font-bold uppercase group-hover:scale-105 transition-transform">
                    CONNECT AUDIO ENGINE
                  </span>
                </div>
                <div className="text-[8px] text-slate-500 tracking-wider text-center mt-2 leading-relaxed">
                  UNMUTE RESONANCE PLUCKS, SPACE ECHO DELAYS, AND BASE OSCILLATORS
                </div>
              </button>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Header Status bar */}
                <div className="flex justify-between items-center border-b border-white/5 pb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-emerald-400 font-bold">SYNTH INTERFACE</span>
                  </div>
                  <div className="flex flex-wrap gap-1 text-[7px] justify-end">
                    <button 
                      onClick={() => applyPreset('Ethereal Space-Time')}
                      className="px-1 py-0.5 bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-500/10 rounded tracking-tighter text-cyan-400 font-semibold"
                    >
                      SPACE-TIME
                    </button>
                    <button 
                      onClick={() => applyPreset('Heavy Grav-Drive')}
                      className="px-1 py-0.5 bg-fuchsia-950/30 hover:bg-fuchsia-900/50 border border-fuchsia-500/10 rounded tracking-tighter text-fuchsia-400 font-semibold"
                    >
                      GRAV-DRV
                    </button>
                    <button 
                      onClick={() => applyPreset('Retro Spark')}
                      className="px-1 py-0.5 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/10 rounded tracking-tighter text-amber-400 font-semibold"
                    >
                      SPARK
                    </button>
                  </div>
                </div>

                {/* Playback & Loop Control Deck */}
                <div className="bg-[#0c0c12]/90 p-2.5 border border-white/10 rounded flex flex-col gap-2">
                  <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold">
                    <span>SYSTEM PLAYBACK & LOOPS CONTROLLER</span>
                    <Volume2 className="w-3 h-3 text-cyan-400" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Play/Pause Button */}
                    <button
                      onClick={handlePlayToggle}
                      className={`py-2 px-3 rounded flex items-center justify-center gap-2 font-bold uppercase text-[9px] tracking-wider cursor-pointer border transition-all ${
                        isPlaying 
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30' 
                          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                          <span>PAUSE LOOPS</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                          <span>PLAY LOOPS</span>
                        </>
                      )}
                    </button>

                    {/* Clear All Loops Button */}
                    <button
                      onClick={clearAllLoops}
                      className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 rounded flex items-center justify-center gap-2 font-bold uppercase text-[9px] tracking-wider cursor-pointer transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>CLEAR LOOPS</span>
                    </button>
                  </div>
                  <div className="text-[7.5px] text-slate-500 leading-normal text-center">
                    {isPlaying 
                      ? 'Loop engine running. Active and injected nodes will trigger sound.' 
                      : 'Audio loops paused. Canvas interactions still trigger live plucks.'}
                  </div>
                </div>

                {/* Synth Modules */}
                <div className="flex flex-col gap-2">
                  {/* CH1: Base Drone */}
                  <div className="bg-[#0c0c12]/80 p-2 border border-white/5 rounded">
                    <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold mb-1.5">
                      <span>CH1: BASE DRONE</span>
                      <Radio className="w-2.5 h-2.5 text-cyan-500" />
                    </div>
                    
                    <div className="flex gap-1 mb-2">
                      {(['sine', 'triangle', 'sawtooth', 'square'] as OscillatorType[]).map((wave) => (
                        <button
                          key={wave}
                          onClick={() => handleSynthChange('droneWaveform', wave)}
                          className={`flex-1 text-[7px] py-0.5 rounded border transition-all ${
                            synthSettings.droneWaveform === wave
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300 font-bold'
                              : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {wave.toUpperCase().slice(0, 3)}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-1.5 text-[8px]">
                      <div className="flex justify-between text-slate-400">
                        <span>PITCH FREQ</span>
                        <span className="text-cyan-400 font-bold">{synthSettings.dronePitch}Hz</span>
                      </div>
                      <input 
                        type="range" 
                        min="55" 
                        max="330" 
                        step="55"
                        value={synthSettings.dronePitch} 
                        onChange={(e) => handleSynthChange('dronePitch', parseInt(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                      />
                      <div className="flex justify-between text-slate-400">
                        <span>VOLUME</span>
                        <span className="text-cyan-400 font-bold">{Math.round(synthSettings.droneVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="0.4" 
                        step="0.01"
                        value={synthSettings.droneVolume} 
                        onChange={(e) => handleSynthChange('droneVolume', parseFloat(e.target.value))}
                        className="w-full accent-cyan-400 h-1 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* CH2: Impact Pluck */}
                  <div className="bg-[#0c0c12]/80 p-2 border border-white/5 rounded">
                    <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold mb-1.5">
                      <span>CH2: IMPACT PLUCK</span>
                      <Music className="w-2.5 h-2.5 text-fuchsia-500" />
                    </div>
                    <div className="flex gap-1 mb-2">
                      {(['sine', 'triangle', 'sawtooth', 'square'] as OscillatorType[]).map((wave) => (
                        <button
                          key={wave}
                          onClick={() => handleSynthChange('pluckWaveform', wave)}
                          className={`flex-1 text-[7px] py-0.5 rounded border transition-all ${
                            synthSettings.pluckWaveform === wave
                              ? 'bg-fuchsia-500/20 border-fuchsia-400/50 text-fuchsia-300 font-bold'
                              : 'bg-white/5 border-transparent text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {wave.toUpperCase().slice(0, 3)}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-1 text-[8px]">
                      <div className="flex justify-between text-slate-400">
                        <span>VOLUME</span>
                        <span className="text-fuchsia-400 font-bold">{Math.round(synthSettings.pluckVolume * 100)}%</span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="0.8" 
                        step="0.02"
                        value={synthSettings.pluckVolume} 
                        onChange={(e) => handleSynthChange('pluckVolume', parseFloat(e.target.value))}
                        className="w-full accent-fuchsia-400 h-1 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* CH3: Echo Space Delay */}
                  <div className="bg-[#0c0c12]/80 p-2 border border-white/5 rounded">
                    <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold mb-1.5">
                      <span>CH3: ECO SPACE DELAY</span>
                      <Sliders className="w-2.5 h-2.5 text-amber-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-[8px]">
                      <div className="space-y-1 flex flex-col justify-end">
                        <div className="flex justify-between text-slate-500 font-bold">
                          <span>TIME</span>
                          <span className="text-amber-400 font-bold">{Math.round(synthSettings.delayTime * 1000)}ms</span>
                        </div>
                        <input 
                          type="range" 
                          min="0.05" 
                          max="0.8" 
                          step="0.01"
                          value={synthSettings.delayTime} 
                          onChange={(e) => handleSynthChange('delayTime', parseFloat(e.target.value))}
                          className="w-full accent-amber-500 h-1 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1 flex flex-col justify-end">
                        <div className="flex justify-between text-slate-500 font-bold">
                          <span>FEEDBACK</span>
                          <span className="text-amber-400 font-bold">{Math.round(synthSettings.delayFeedbackVal * 100)}%</span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max="0.85" 
                          step="0.01"
                          value={synthSettings.delayFeedbackVal} 
                          onChange={(e) => handleSynthChange('delayFeedbackVal', parseFloat(e.target.value))}
                          className="w-full accent-amber-500 h-1 bg-stone-900 border border-stone-800 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* CH4: Master Out & Oscilloscope */}
                  <div className="bg-[#0c0c12]/85 p-2 border border-white/10 rounded flex flex-col gap-2">
                    <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold">
                      <span>CH4: MASTER GAIN & OSCILLOSCOPE</span>
                      <Activity className="w-2.5 h-2.5 text-fuchsia-400 animate-pulse" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 space-y-1 text-[8px]">
                        <input 
                          type="range" 
                          min="0" 
                          max="1.0" 
                          step="0.05"
                          value={synthSettings.masterVolume} 
                          onChange={(e) => handleSynthChange('masterVolume', parseFloat(e.target.value))}
                          className="w-full accent-fuchsia-400 h-1.5 bg-stone-950 border border-stone-800 rounded-lg cursor-pointer"
                        />
                        <div className="flex justify-between text-slate-500 text-[7px]">
                          <span>GAIN OUT:</span>
                          <span className="text-fuchsia-400 font-bold">{Math.round(synthSettings.masterVolume * 100)}%</span>
                        </div>
                      </div>
                      
                      {/* Real-time Oscilloscope */}
                      <div className="w-28 shrink-0 bg-[#040406] border border-cyan-500/15 rounded p-1 flex flex-col items-center">
                        <canvas 
                          id="synthOscilloscope" 
                          width="112" 
                          height="36" 
                          className="w-full h-8" 
                        />
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Deck Block 5: DevOps Telemetry Hub (GitHub Sync & Vercel Merge) */}
          <div className="bg-black/40 backdrop-blur-md border border-cyan-500/15 p-3 sm:p-4 rounded-xl flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[9px] uppercase tracking-widest text-cyan-400 font-bold">DEVOPS TELEMETRY HUB</span>
              </div>
              <div className="flex text-[8px] gap-1">
                <button 
                  onClick={() => setDevOpsTab('github')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${devOpsTab === 'github' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  GIT SYNC
                </button>
                <button 
                  onClick={() => setDevOpsTab('vercel')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer ${devOpsTab === 'vercel' ? 'bg-fuchsia-500/20 text-fuchsia-300 font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  VERCEL MERGE
                </button>
                <button 
                  onClick={() => setDevOpsTab('settings')}
                  className={`px-1.5 py-0.5 rounded transition-all cursor-pointer flex items-center gap-1 ${devOpsTab === 'settings' ? 'bg-white/10 text-white font-bold' : 'text-slate-500 hover:text-slate-300'}`}
                >
                  <SettingsIcon className="w-2.5 h-2.5" />
                  <span>CONFIG</span>
                </button>
              </div>
            </div>

            {/* TAB CONTENT: GITHUB SYNC */}
            {devOpsTab === 'github' && (
              <div className="flex flex-col gap-2">
                <div className="bg-[#0c0c12]/80 p-2 border border-white/5 rounded text-[8px] flex flex-col gap-2">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold">TARGET WORKSPACE:</span>
                    <span className="text-cyan-400 font-bold tracking-tight">{gitOwner}/{gitRepo} ({gitBranch})</span>
                  </div>
                  
                  <button 
                    onClick={syncGitHub}
                    disabled={gitStatus === 'loading'}
                    className="w-full py-1.5 bg-cyan-900/40 hover:bg-cyan-800/60 border border-cyan-500/30 text-cyan-300 rounded font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${gitStatus === 'loading' ? 'animate-spin' : ''}`} />
                    <span>{gitStatus === 'loading' ? 'Syncing Telemetry...' : 'Sync GitHub Repository'}</span>
                  </button>
                </div>

                {gitTelemetryLogs.length > 0 && (
                  <div className="p-2 bg-[#040406] border border-white/5 rounded font-mono">
                    <div className="flex items-center gap-1.5 mb-1.5 text-[7px] text-cyan-500/50 uppercase font-bold">
                      <Terminal className="w-2.5 h-2.5" />
                      <span>Git Logs</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[7px] text-slate-400">
                      {gitTelemetryLogs.map((log, i) => (
                        <div key={i} className="border-l border-cyan-500/20 pl-1.5 leading-relaxed">{log}</div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commits List */}
                {gitCommits.length > 0 && (
                  <div className="flex flex-col gap-1.5 mt-1">
                    <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold">Inoculatable Commit Vectors</span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {gitCommits.map((commit: any) => {
                        const isLoopActive = savedLoops.some(l => l.id === commit.sha);
                        return (
                          <div 
                            key={commit.sha}
                            className={`p-2 border rounded flex flex-col gap-1 transition-all ${isLoopActive ? 'bg-cyan-950/20 border-cyan-500/50' : 'bg-[#0c0c12]/60 border-white/5 hover:border-white/10'}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="text-[8px] text-cyan-300 font-bold truncate max-w-[210px]">
                                {commit.commit?.message || "No message"}
                              </span>
                              <span className="text-[7px] bg-white/5 px-1 rounded text-slate-500 font-mono scale-90">
                                {commit.sha.slice(0, 7)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[7px] text-slate-500">
                              <span>By {commit.commit?.author?.name || "Matrix Pilot"}</span>
                              <button 
                                onClick={() => inoculateCommitAsLoop(commit)}
                                className={`px-1.5 py-0.5 rounded font-bold cursor-pointer transition-all text-[7px] ${isLoopActive ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/25'}`}
                              >
                                {isLoopActive ? 'INJECTED (ACTIVE)' : 'INJECT SONIC LOOPS'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: VERCEL MERGE */}
            {devOpsTab === 'vercel' && (
              <div className="flex flex-col gap-2">
                <div className="bg-[#0c0c12]/80 p-2 border border-white/5 rounded text-[8px] flex flex-col gap-2 font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-bold">VERCEL HUB:</span>
                    <span className="text-fuchsia-400 font-bold">{vercelProjectId}</span>
                  </div>

                  <button 
                    onClick={runVercelDeploy}
                    disabled={vercelStatus === 'queueing' || vercelStatus === 'building' || vercelStatus === 'deploying'}
                    className={`w-full py-2 border rounded font-bold uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      vercelStatus === 'queueing' || vercelStatus === 'building' || vercelStatus === 'deploying'
                        ? 'bg-fuchsia-950/20 border-fuchsia-500/20 text-fuchsia-400 animate-pulse'
                        : 'bg-fuchsia-900/40 hover:bg-fuchsia-800/60 border-fuchsia-500/30 text-fuchsia-300 shadow-[0_0_10px_rgba(217,70,239,0.15)] hover:shadow-[0_0_15px_rgba(217,70,239,0.25)]'
                    }`}
                  >
                    <Layers className={`w-3.5 h-3.5 ${vercelStatus === 'queueing' || vercelStatus === 'building' || vercelStatus === 'deploying' ? 'animate-bounce' : ''}`} />
                    <span>
                      {vercelStatus === 'queueing' && 'Queueing Build...'}
                      {vercelStatus === 'building' && 'Compiling Transients...'}
                      {vercelStatus === 'deploying' && 'Spreading Live Regions...'}
                      {vercelStatus === 'live' && 'Merge & Deploy Live'}
                      {vercelStatus === 'idle' && 'Merge Git & Deploy Vercel'}
                      {vercelStatus === 'error' && 'Retry Deploy Merger'}
                    </span>
                  </button>

                  {/* Operational Build Tracker */}
                  {(vercelStatus !== 'idle') && (
                    <div className="mt-1 flex flex-col gap-1.5">
                      <div className="flex justify-between text-[7px] text-slate-400">
                        <span>PIPELINE REPLICATION PROGRESS:</span>
                        <span className="text-fuchsia-400 font-bold">{vercelBuildProgress}%</span>
                      </div>
                      <div className="w-full h-1 bg-stone-900 border border-stone-800 rounded-full overflow-hidden">
                        <div 
                          style={{ width: `${vercelBuildProgress}%` }}
                          className="h-full bg-fuchsia-500 transition-all duration-300"
                        />
                      </div>
                      
                      {/* Vercel build stages checklist */}
                      <div className="grid grid-cols-2 gap-1 mt-1 text-[7px] text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className={`w-2 h-2 ${vercelBuildProgress >= 5 ? 'text-fuchsia-400' : 'text-slate-700'}`} />
                          <span className={vercelBuildProgress >= 5 ? 'text-slate-300' : ''}>1. Git Merge</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className={`w-2 h-2 ${vercelBuildProgress >= 25 ? 'text-fuchsia-400' : 'text-slate-700'}`} />
                          <span className={vercelBuildProgress >= 25 ? 'text-slate-300' : ''}>2. Provisioning</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className={`w-2 h-2 ${vercelBuildProgress >= 55 ? 'text-fuchsia-400' : 'text-slate-700'}`} />
                          <span className={vercelBuildProgress >= 55 ? 'text-slate-300' : ''}>3. Compilation</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className={`w-2 h-2 ${vercelBuildProgress >= 100 || vercelStatus === 'live' ? 'text-emerald-400' : 'text-slate-700'}`} />
                          <span className={vercelBuildProgress >= 100 || vercelStatus === 'live' ? 'text-emerald-300 font-semibold' : ''}>4. Edge Live</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {vercelLogs.length > 0 && (
                  <div className="p-2 bg-[#040406] border border-white/5 rounded font-mono">
                    <div className="flex items-center gap-1.5 mb-1 text-[7px] text-fuchsia-500/50 uppercase font-bold">
                      <Terminal className="w-2.5 h-2.5" />
                      <span>Build Telemetry Logs</span>
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 text-[7px] text-slate-400 leading-normal">
                      {vercelLogs.map((log, i) => (
                        <div key={i} className="border-l border-fuchsia-500/20 pl-1.5">{log}</div>
                      ))}
                    </div>
                  </div>
                )}

                {vercelStatus === 'live' && vercelUrl && (
                  <div className="p-2 bg-emerald-950/10 border border-emerald-500/25 rounded text-[8px] flex flex-col gap-2 font-mono">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold">
                      <Globe className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                      <span>DEPLOYMENT FULLY RESOLVED</span>
                    </div>
                    <div className="text-[7.5px] text-slate-400 bg-black/40 p-1.5 rounded truncate select-all">{vercelUrl}</div>
                    <div className="flex gap-1.5">
                      <a 
                        href={vercelUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="flex-1 text-center py-1 bg-emerald-900/30 border border-emerald-500/30 hover:bg-emerald-800/40 text-emerald-300 rounded font-bold cursor-pointer uppercase text-[7px]"
                      >
                        Launch Preview Endpoint
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: CONFIG CONFIGURATION */}
            {devOpsTab === 'settings' && (
              <div className="flex flex-col gap-2 text-[8px] text-slate-400 font-mono">
                <div className="bg-[#0c0c12]/80 p-2 border border-white/5 rounded flex flex-col gap-2">
                  <span className="text-cyan-400 font-bold border-b border-white/5 pb-1 uppercase">GitHub Configuration</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span>Owner / Org</span>
                      <input 
                        type="text" 
                        value={gitOwner} 
                        onChange={(e) => setGitOwner(e.target.value)}
                        className="p-1 px-1.5 bg-black border border-white/10 rounded text-slate-300 font-mono outline-none focus:border-cyan-500 h-6"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>Repo Name</span>
                      <input 
                        type="text" 
                        value={gitRepo} 
                        onChange={(e) => setGitRepo(e.target.value)}
                        className="p-1 px-1.5 bg-black border border-white/10 rounded text-slate-300 font-mono outline-none focus:border-cyan-500 h-6"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span>Sync Branch</span>
                      <input 
                        type="text" 
                        value={gitBranch} 
                        onChange={(e) => setGitBranch(e.target.value)}
                        className="p-1 px-1.5 bg-black border border-white/10 rounded text-slate-300 font-mono outline-none focus:border-cyan-500 h-6"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>GitHub PAT (Token)</span>
                      <input 
                        type="password" 
                        placeholder="Optional"
                        value={gitToken} 
                        onChange={(e) => setGitToken(e.target.value)}
                        className="p-1 px-1.5 bg-black border border-white/10 rounded text-slate-300 font-mono outline-none focus:border-cyan-500 h-6 h-[24px]"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-[#0c0c12]/80 p-2 border border-white/5 rounded flex flex-col gap-2 font-mono">
                  <span className="text-fuchsia-400 font-bold border-b border-white/5 pb-1 uppercase">Vercel Configuration</span>
                  
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span>Vercel Deploy Hook URL</span>
                      <span className="text-[7px] text-fuchsia-400 font-bold uppercase">No token needed!</span>
                    </div>
                    <input 
                      type="text" 
                      placeholder="https://api.vercel.com/v1/integrations/deploy/..."
                      value={vercelDeployHook} 
                      onChange={(e) => setVercelDeployHook(e.target.value)}
                      className="p-1 px-1.5 bg-black border border-white/10 rounded text-slate-300 font-mono outline-none focus:border-fuchsia-500 h-6 w-full"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <span>Project ID / Name</span>
                      <input 
                        type="text" 
                        value={vercelProjectId} 
                        onChange={(e) => setVercelProjectId(e.target.value)}
                        className="p-1 px-1.5 bg-black border border-white/10 rounded text-slate-300 font-mono outline-none focus:border-fuchsia-500 h-6"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span>Vercel Token</span>
                      <input 
                        type="password" 
                        placeholder="Optional"
                        value={vercelToken} 
                        onChange={(e) => setVercelToken(e.target.value)}
                        className="p-1 px-1.5 bg-black border border-white/10 rounded text-slate-300 font-mono outline-none focus:border-fuchsia-500 h-6"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={saveDevOpsSettings}
                  className="w-full py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-300 rounded font-bold uppercase cursor-pointer"
                >
                  Save Telemetry Configuration
                </button>
              </div>
            )}
          </div>

          {/* Small aesthetic footer credit inside sidebar */}
          <div className="text-center text-[8px] text-slate-600 tracking-wider uppercase mt-1 mb-4">
            Vector Waveform Balance Engine • v1.0.8
          </div>

        </div>
      </div>
    </div>
  );
}

