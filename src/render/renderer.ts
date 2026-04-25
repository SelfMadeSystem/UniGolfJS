import { $scene } from "@/scenes/state";
import type { RenderInfo } from "./drawable";

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = performance.now();
  private requestId: number | null = null;
  private readonly tickInterval: number = 1000 / 30;
  private tickAccumulator: number = 0;
  private readonly stopCbs: (() => void)[] = [];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  start() {
    const loop = (time: number) => {
      const delta = time - this.lastTime;
      this.lastTime = time;
      this.tickAccumulator += delta;

      while (this.tickAccumulator >= this.tickInterval) {
        this.tick();
        this.tickAccumulator -= this.tickInterval;
      }

      const tickInterp = this.tickAccumulator / this.tickInterval;
      const renderInfo: RenderInfo = {
        delta,
        tickInterp,
        tick: Math.floor(this.lastTime / this.tickInterval),
      };

      this.ctx.save();
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      this.render(renderInfo);

      this.ctx.restore();

      this.requestId = requestAnimationFrame(loop);
    };
    this.requestId = requestAnimationFrame(loop);

    this.stopCbs.push(() => {
      if (this.requestId === null) return;
      cancelAnimationFrame(this.requestId);
      this.requestId = null;
    });

    const pointerDownHandler = (e: PointerEvent) => this.handlePointerDown(e);
    const pointerMoveHandler = (e: PointerEvent) => this.handlePointerMove(e);
    const pointerUpHandler = (e: PointerEvent) => this.handlePointerUp(e);

    window.addEventListener("pointerdown", pointerDownHandler);
    window.addEventListener("pointermove", pointerMoveHandler);
    window.addEventListener("pointerup", pointerUpHandler);

    this.stopCbs.push(() => {
      window.removeEventListener("pointerdown", pointerDownHandler);
      window.removeEventListener("pointermove", pointerMoveHandler);
      window.removeEventListener("pointerup", pointerUpHandler);
    });
  }

  stop() {
    for (const cb of this.stopCbs) {
      cb();
    }
    this.stopCbs.length = 0;
  }

  render(info: RenderInfo) {
    const scene = $scene.get();
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    scene.render(info, this.ctx);
  }

  tick() {
    const scene = $scene.get();
    scene.tick();
  }

  getPointerPos(event: PointerEvent): { x: number; y: number } {
    const rect = this.ctx.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  handlePointerDown(event: PointerEvent) {
    const pos = this.getPointerPos(event);
    const scene = $scene.get();
    scene.pointerdown(pos.x, pos.y);
  }

  handlePointerMove(event: PointerEvent) {
    const pos = this.getPointerPos(event);
    const scene = $scene.get();
    scene.pointermove(pos.x, pos.y);
  }

  handlePointerUp(event: PointerEvent) {
    const pos = this.getPointerPos(event);
    const scene = $scene.get();
    scene.pointerup(pos.x, pos.y);
  }
}
