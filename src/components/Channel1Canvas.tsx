import React, { useEffect, useRef } from 'react';

interface Channel1CanvasProps {
  magnitude: number;
  resonance: number;
  dragX: number;
  dragY: number;
  isDragging: boolean;
}

const Channel1Canvas: React.FC<Channel1CanvasProps> = ({ 
  magnitude, 
  resonance, 
  dragX, 
  dragY, 
  isDragging 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);
    resize();

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

          // Add wave distortion
          dx += Math.sin(time + i * 0.2) * (2 + resonance * 5);
          dy += Math.cos(time + j * 0.2) * (2 + resonance * 5);

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

          dx += Math.sin(time + i * 0.2) * (2 + resonance * 5);
          dy += Math.cos(time + j * 0.2) * (2 + resonance * 5);

          if (i === 0) {
            ctx.moveTo(x + dx, y + dy);
          } else {
            ctx.lineTo(x + dx, y + dy);
          }
        }
        ctx.stroke();
      }

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
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [dragX, dragY, isDragging, magnitude, resonance]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
    />
  );
};

export default Channel1Canvas;
