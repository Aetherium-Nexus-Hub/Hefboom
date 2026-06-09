import React, { useEffect, useRef } from 'react';

interface Channel1CanvasProps {
  magnitude: number;
  resonance: number;
  dragX: number;
  dragY: number;
  isDragging: boolean;
  wave_output_Y?: number;
  flux_intensity?: number;
  phase_angle?: number;
}

const Channel1Canvas: React.FC<Channel1CanvasProps> = ({ 
  magnitude, 
  resonance, 
  dragX, 
  dragY, 
  isDragging,
  wave_output_Y = 1.0,
  flux_intensity = 100.0,
  phase_angle = 0.0
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const parent = canvas.parentElement;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = width;
        canvas.height = height;
      }
    });

    if (parent) {
      resizeObserver.observe(parent);
    } else {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const render = () => {
      time += 0.05;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const gridSize = 40;
      const cols = Math.ceil(canvas.width / gridSize) + 1;
      const rows = Math.ceil(canvas.height / gridSize) + 1;

      // Draw Lattice
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.1 + resonance * 0.2})`;
      ctx.lineWidth = 1;

      for (let i = 0; i < cols; i++) {
        ctx.beginPath();
        for (let j = 0; j < rows; j++) {
          const x = i * gridSize;
          const y = j * gridSize;

          let dx = 0;
          let dy = 0;

          if (isDragging) {
            const dist = Math.hypot(x - dragX, y - dragY);
            if (dist < 300) {
              const force = (300 - dist) / 300;
              const angle = Math.atan2(y - dragY, x - dragX);
              dx = Math.cos(angle) * force * magnitude * 0.5 * resonance;
              dy = Math.sin(angle) * force * magnitude * 0.5 * resonance;
            }
          }

          // Add wave distortion based on both kinetic drag and server-side global wave
          dx += Math.sin(time + i * 0.2 + phase_angle) * (2 + resonance * 5 + Math.abs(wave_output_Y) * 3);
          dy += Math.cos(time + j * 0.2 + phase_angle) * (2 + resonance * 5 + Math.abs(wave_output_Y) * 3);

          if (j === 0) {
            ctx.moveTo(x + dx, y + dy);
          } else {
            ctx.lineTo(x + dx, y + dy);
          }
        }
        ctx.stroke();
      }

      for (let j = 0; j < rows; j++) {
        ctx.beginPath();
        for (let i = 0; i < cols; i++) {
          const x = i * gridSize;
          const y = j * gridSize;

          let dx = 0;
          let dy = 0;

          if (isDragging) {
            const dist = Math.hypot(x - dragX, y - dragY);
            if (dist < 300) {
              const force = (300 - dist) / 300;
              const angle = Math.atan2(y - dragY, x - dragX);
              dx = Math.cos(angle) * force * magnitude * 0.5 * resonance;
              dy = Math.sin(angle) * force * magnitude * 0.5 * resonance;
            }
          }

          dx += Math.sin(time + i * 0.2 + phase_angle) * (2 + resonance * 5 + Math.abs(wave_output_Y) * 3);
          dy += Math.cos(time + j * 0.2 + phase_angle) * (2 + resonance * 5 + Math.abs(wave_output_Y) * 3);

          if (i === 0) {
            ctx.moveTo(x + dx, y + dy);
          } else {
            ctx.lineTo(x + dx, y + dy);
          }
        }
        ctx.stroke();
      }

      // Draw fluorescent glowing physical wave on the oscilloscope
      ctx.beginPath();
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.25 + (Math.abs(wave_output_Y) * 0.25)})`;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 10 + (Math.abs(wave_output_Y) * 10);
      ctx.shadowColor = "rgba(0, 255, 136, 0.6)";

      const centerY = canvas.height / 2;
      for (let x = 0; x <= canvas.width; x += 4) {
        const theta = (x / canvas.width) * Math.PI * 4 + time + phase_angle;
        // Frequency proportional to flux intensity, amplitude scaled by wave Y
        const amp = (wave_output_Y * 20.0) * (1.0 + resonance);
        const cycle = Math.sin(theta * (1.0 + (flux_intensity - 100) * 0.005)) * amp;
        const finalY = centerY + cycle;

        if (x === 0) {
          ctx.moveTo(x, finalY);
        } else {
          ctx.lineTo(x, finalY);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0; // reset glow

      // Scanner Line
      const scannerY = (Math.sin(time * 0.5) * 0.5 + 0.5) * canvas.height;
      ctx.strokeStyle = `rgba(0, 255, 136, ${0.05 + resonance * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, scannerY);
      ctx.lineTo(canvas.width, scannerY);
      ctx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationFrameId);
    };
  }, [dragX, dragY, isDragging, magnitude, resonance, wave_output_Y, flux_intensity, phase_angle]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
    />
  );
};

export default Channel1Canvas;
