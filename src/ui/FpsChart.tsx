import { $fpsTickCounter } from '@/stores/fpsChart';
import { useStore } from '@nanostores/react';
import { useEffect, useRef } from 'react';

type FpsChartProps = {
  className?: string;
  maxFps?: number;
  historySize?: number;
};

export function FpsChart({
  className,
  maxFps = 240,
  historySize = 120,
}: FpsChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fpsHistory = useRef<number[]>([]);
  const tickMarkers = useRef<number[]>([]);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const fpsTickCounter = useStore($fpsTickCounter);
  const lastTickCounterRef = useRef<number>(fpsTickCounter);
  const latestTickCounterRef = useRef<number>(fpsTickCounter);

  latestTickCounterRef.current = fpsTickCounter;

  const drawChart = (canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const history = fpsHistory.current;
    if (history.length === 0) return;

    const padding = 8;
    const chartHeight = height - padding * 2;
    const chartWidth = width - padding * 2;
    const barWidth = chartWidth / historySize;

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 0.5;
    tickMarkers.current.forEach(markerIndex => {
      if (markerIndex < 0 || markerIndex >= history.length) return;
      const x = padding + markerIndex * barWidth;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, padding + chartHeight);
      ctx.stroke();
    });
    ctx.restore();

    const latest = history[history.length - 1] ?? 0;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const avg = history.reduce((sum, fps) => sum + fps, 0) / history.length;

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 2;
    ctx.beginPath();

    history.forEach((fps, index) => {
      const x = padding + index * barWidth;
      const normalized = Math.min(fps, maxFps) / maxFps;
      const y = padding + chartHeight - normalized * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });

    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '12px ui-sans-serif, system-ui';
    ctx.textBaseline = 'top';
    ctx.fillText(`${latest.toFixed(1)} FPS`, padding, padding);
    ctx.fillText(`avg ${avg.toFixed(1)}`, padding, padding + 14);
    ctx.fillText(`min ${min.toFixed(1)}`, padding + 72, padding + 14);
    ctx.fillText(`max ${max.toFixed(1)}`, padding + 72, padding);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const tick = (time: number) => {
      const history = fpsHistory.current;

      if (lastTimeRef.current !== null) {
        const delta = time - lastTimeRef.current;
        const fps = delta > 0 ? 1000 / delta : maxFps;
        history.push(fps);
        if (history.length > historySize) {
          history.shift();
          tickMarkers.current = tickMarkers.current
            .map(marker => marker - 1)
            .filter(marker => marker >= 0);
        }
      }

      const currentTickCounter = latestTickCounterRef.current;
      if (currentTickCounter !== lastTickCounterRef.current) {
        lastTickCounterRef.current = currentTickCounter;
        tickMarkers.current.push(history.length - 1);
      }

      lastTimeRef.current = time;
      drawChart(canvas);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    resizeObserverRef.current = new ResizeObserver(() => {
      if (canvasRef.current) drawChart(canvasRef.current);
    });
    resizeObserverRef.current.observe(canvas);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect();
    };
  }, [historySize, maxFps]);

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        width: '240px',
        height: '120px',
        pointerEvents: 'none',
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
