import { useEffect, useState } from "react";
import { Renderer } from "./renderer";

export function CanvasComponent() {
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [renderer, setRenderer] = useState<Renderer | null>(null);

  useEffect(() => {
    if (!canvas) return;

    let theRenderer: Renderer;

    if (!renderer) {
      const newRenderer = new Renderer(canvas);
      newRenderer.start();
      theRenderer = newRenderer;
      setRenderer(newRenderer);
    } else {
      theRenderer = renderer;
    }

    const handleResize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      theRenderer.render({
        tick: 0,
        tickInterp: 0,
        tickWithInterp: 0,
        ...theRenderer.lastRenderInfo,
        delta: 0,
      });
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
