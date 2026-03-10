'use client';

import { useEffect, useRef, useState } from 'react';
import { useDeviceRealtime } from '@/hooks/useDeviceData';

interface RealTimeChartProps {
  config: {
    title?: string;
    deviceId?: string;
    field?: string;
    color?: string;
    maxPoints?: number;
  };
}

export function RealTimeChart({ config }: RealTimeChartProps) {
  const { title = 'Real-Time', deviceId, field, color = '#00B050', maxPoints = 60 } = config;
  const { state } = useDeviceRealtime(deviceId || '');
  const [points, setPoints] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);

  // Simulated waveform when no deviceId is configured
  useEffect(() => {
    if (deviceId) return;
    const interval = setInterval(() => {
      phaseRef.current += 0.15;
      const p = phaseRef.current;
      const noise = (Math.random() - 0.5) * 0.4;
      const val = Math.sin(p) * 1.5 + Math.sin(p * 3.1) * 0.4 + noise;
      setPoints((prev) => {
        const next = [...prev, val];
        return next.length > maxPoints ? next.slice(-maxPoints) : next;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [deviceId, maxPoints]);

  // Real device data accumulation
  useEffect(() => {
    if (!deviceId || !state || !field || state.data?.[field] === undefined) return;
    const val = Number(state.data[field]);
    if (isNaN(val)) return;
    setPoints((prev) => {
      const next = [...prev, val];
      return next.length > maxPoints ? next.slice(-maxPoints) : next;
    });
  }, [state, field, maxPoints, deviceId]);

  // Draw waveform on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (points.length < 2) return;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const pad = 8;

    const toY = (v: number) => H - pad - ((v - min) / range) * (H - 2 * pad);
    const toX = (i: number) => (i / (points.length - 1)) * W;

    // Fill area (green-tinted gradient)
    ctx.beginPath();
    ctx.moveTo(toX(0), H);
    points.forEach((v, i) => ctx.lineTo(toX(i), toY(v)));
    ctx.lineTo(toX(points.length - 1), H);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, 'rgba(0,176,80,0.25)');
    grad.addColorStop(1, 'rgba(0,176,80,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    points.forEach((v, i) => {
      if (i === 0) ctx.moveTo(toX(0), toY(v));
      else ctx.lineTo(toX(i), toY(v));
    });
    ctx.stroke();

    // Latest value dot
    const lastX = toX(points.length - 1);
    const lastY = toY(points[points.length - 1]);
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [points, color]);

  const latestVal = points.length > 0 ? points[points.length - 1].toFixed(2) : '—';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="k-card-title">{title}</span>
        <span style={{ fontFamily: 'var(--k-font-tech)', fontSize: 12, color }}>
          {latestVal}
        </span>
      </div>
      <div
        style={{
          flex: 1,
          background: 'rgba(6,15,30,0.6)',
          border: '1px solid var(--k-border)',
          borderRadius: 3,
          overflow: 'hidden',
          minHeight: 80,
        }}
      >
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>
    </div>
  );
}
