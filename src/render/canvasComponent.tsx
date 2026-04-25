import { useEffect, useState } from "react";
import { Renderer } from "./renderer";

export function CanvasComponent() {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);

  useEffect(() => {
    if (!canvas) return;

    if (!renderer) {
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        console.error("Failed to get canvas context");
        return;
      }
      const newRenderer = new Renderer(ctx);
      newRenderer.start();
      setRenderer(newRenderer);
    }

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
    };

    handleResize();
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(canvas);

    return () => {
      resizeObserver.disconnect();
    };
  }, [canvas]);

  return (
    <canvas ref={setCanvas} className="absolute inset-0 w-full h-full -z-10" />
  );
}
