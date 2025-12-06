import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number; // 0 to 1
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    
    // Smooth the volume
    let currentVolume = 0;

    const draw = () => {
      // Interpolate volume for smoothness
      currentVolume += (volume - currentVolume) * 0.2;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      
      ctx.clearRect(0, 0, width, height);

      if (isActive) {
        // Draw pulsing circles
        const baseRadius = 40;
        const maxRadius = 100;
        const radius = baseRadius + (currentVolume * (maxRadius - baseRadius) * 5); // Amplify for effect

        // Outer glow
        const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(56, 189, 248, 0.8)'); // Light blue
        gradient.addColorStop(1, 'rgba(56, 189, 248, 0)');

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Inner solid circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, 2 * Math.PI);
        ctx.fillStyle = '#0ea5e9'; // Sky 500
        ctx.fill();
      } else {
        // Idle state
        ctx.beginPath();
        ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI);
        ctx.fillStyle = '#334155'; // Slate 700
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [volume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={300} 
      height={300} 
      className="w-full h-64 object-contain"
    />
  );
};

export default Visualizer;
