/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap } from 'lucide-react';

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

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [metrics, setMetrics] = useState({ input: 0, output: 0 });
  const [isInteractionActive, setIsInteractionActive] = useState(false);
  
  // Physics & State refs to avoid closure staleness in the loop
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
    anchors: [] as { x: number, y: number }[]
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = w;
      canvas.height = h;
      const state = stateRef.current;
      state.cx = w / 2;
      state.cy = h / 2;
      
      // Update corner anchors
      state.anchors = [
        { x: 40, y: 40 },           // Top Left
        { x: w - 40, y: 40 },      // Top Right
        { x: 40, y: h - 40 },      // Bottom Left
        { x: w - 40, y: h - 40 }   // Bottom Right
      ];

      if (state.x === 0) {
        state.x = state.cx;
        state.y = state.cy;
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = () => {
      const state = stateRef.current;
      const { cx, cy, k, damping, baseR, anchors } = state;

      // 1. Clear & Draw Background Grid
      ctx.fillStyle = '#0A0A0F';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      // 2. Draw Corner Hook UI
      anchors.forEach(anchor => {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Corner bracket style
        const size = 15;
        const offsetX = anchor.x < cx ? 1 : -1;
        const offsetY = anchor.y < cy ? 1 : -1;
        
        ctx.moveTo(anchor.x, anchor.y + size * offsetY);
        ctx.lineTo(anchor.x, anchor.y);
        ctx.lineTo(anchor.x + size * offsetX, anchor.y);
        ctx.stroke();

        // Glowing node in the corner hook
        ctx.fillStyle = state.isDragging ? 'rgba(34, 211, 238, 0.4)' : 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(anchor.x, anchor.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Multi-Vector Physics
      if (!state.isDragging) {
        // Sum of forces from all 4 anchors
        anchors.forEach(anchor => {
          const dx = anchor.x - state.x;
          const dy = anchor.y - state.y;
          state.vx += dx * k;
          state.vy += dy * k;
        });

        // Add a slight centering force to ensure a stable equilibrium
        const cdx = cx - state.x;
        const cdy = cy - state.y;
        state.vx += cdx * 0.05;
        state.vy += cdy * 0.05;

        state.vx *= damping;
        state.vy *= damping;
        state.x += state.vx;
        state.y += state.vy;
      }

      // 4. Draw Vector Connections (Hefboom Strings)
      const dist = Math.hypot(state.x - cx, state.y - cy);
      const angle = Math.atan2(state.y - cy, state.x - cx);

      ctx.save();
      anchors.forEach(anchor => {
        const opacity = state.isDragging ? 0.3 : 0.05;
        ctx.strokeStyle = state.isDragging ? `rgba(34, 211, 238, ${opacity})` : `rgba(255, 255, 255, ${opacity})`;
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
      const highlightColor = state.isDragging ? 'rgb(34, 211, 238)' : 'rgb(245, 245, 245)';
      
      ctx.save();
      ctx.shadowBlur = state.isDragging ? 40 : 15;
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
        ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
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

      requestAnimationFrame(animate);
    };

    const handlePointerDown = (e: PointerEvent) => {
      const state = stateRef.current;
      const d = Math.hypot(e.clientX - state.x, e.clientY - state.y);
      if (d < state.baseR * 2) {
        state.isDragging = true;
        state.vx = 0;
        state.vy = 0;
        state.maxDist = 0;
        state.targetLightness = 60;
        state.targetSaturation = 100;
        setIsInteractionActive(true);
        // Do not reset output immediately if user wants to see their last score
      }
    };

    const handlePointerMove = (e: PointerEvent) => {
      const state = stateRef.current;
      if (state.isDragging) {
        state.x = e.clientX;
        state.y = e.clientY;
        const d = Math.hypot(state.x - state.cx, state.y - state.cy);
        state.maxDist = Math.max(state.maxDist, d);
        setMetrics(m => ({ ...m, input: Math.round(d) }));
      }
    };

    const handlePointerUp = () => {
      const state = stateRef.current;
      if (state.isDragging) {
        state.isDragging = false;
        state.targetLightness = 25;
        state.targetSaturation = 0;
        
        const finalVal = Math.round(state.maxDist);
        setMetrics(m => ({ input: m.input, output: finalVal }));
        
        // Reset input visual after a short delay
        setTimeout(() => setMetrics(m => ({ ...m, input: 0 })), 500);

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
    };

    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    const animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  const tensionPercent = Math.min(100, (metrics.input / 300) * 100);
  const forcePercent = Math.min(100, (metrics.output / 300) * 100);

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] text-white font-mono overflow-hidden select-none touch-none">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
      />

      {/* HUD Container */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 flex items-center gap-12 z-20 w-full justify-center px-6">
        {/* Tension Panel */}
        <div className="flex flex-col items-center w-48">
          <span className="text-[10px] tracking-[0.3em] text-slate-500 mb-2 uppercase">Input Tension</span>
          <div className="text-5xl font-light tracking-tighter tabular-nums">
            {metrics.input.toString().padStart(3, '0')}
          </div>
          <div className="w-full h-1 bg-slate-800 mt-4 overflow-hidden rounded-full">
            <div 
              style={{ width: `${tensionPercent}%` }}
              className="h-full bg-cyan-400 transition-all duration-75 shadow-[0_0_8px_rgba(34,211,238,0.5)]" 
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-16 w-px bg-slate-800 self-center" />

        {/* Output Panel */}
        <div className="flex flex-col items-center w-48">
          <span className="text-[10px] tracking-[0.3em] text-slate-500 mb-2 uppercase">Output Kinetic</span>
          <div className="text-5xl font-light tracking-tighter text-fuchsia-500 tabular-nums">
            {metrics.output.toString().padStart(3, '0')}
          </div>
          <div className="w-full h-1 bg-slate-800 mt-4 overflow-hidden rounded-full">
            <div 
              style={{ width: `${forcePercent}%` }}
              className="h-full bg-fuchsia-500 transition-all duration-75 shadow-[0_0_8px_rgba(217,70,239,0.5)]" 
            />
          </div>
        </div>
      </div>

      {/* Footer Left */}
      <div className="absolute bottom-10 left-10 text-[10px] text-slate-600 tracking-widest uppercase flex flex-col gap-1 pointer-events-none">
        <div>System: <span className={isInteractionActive ? "text-cyan-500" : "text-slate-600"}>Active</span></div>
        <div>Mode: Elastic Catapult</div>
        <div className="animate-pulse">Status: {stateRef.current.isDragging ? 'Calibrating...' : 'Awaiting Interaction'}</div>
      </div>

      {/* Footer Right */}
      <div className="absolute bottom-10 right-10 text-right text-[10px] text-slate-600 tracking-widest uppercase pointer-events-none">
        <div>Vector Balance Engine v1.0.4</div>
        <div>Measured Energy Equivalent</div>
      </div>
    </div>
  );
}

