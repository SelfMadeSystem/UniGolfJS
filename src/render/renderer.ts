import { $scene } from "@/scenes/state";
import type { RenderInfo } from "./drawable";
import { Vector2 } from "@/utils/vec";

export type PointerInfo = {
  pos: Vector2;
  leftButton: boolean;
  rightButton: boolean;
  middleButton: boolean;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  event: PointerEvent;
  eventType: "pointerdown" | "pointermove" | "pointerup";
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private requestId: number | null = null;
  private readonly tickInterval: number = 1000 / 30;
  private tickAccumulator: number = 0;
  private tickCount: number = 0;
  private readonly stopCbs: (() => void)[] = [];
  public lastRenderInfo: RenderInfo | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  start() {
    const loop = (time: number) => {
      if (!this.lastTime) this.lastTime = time;
      const delta = time - this.lastTime;
      this.lastTime = time;
      this.tickAccumulator += delta;

      while (this.tickAccumulator >= this.tickInterval) {
        this.tick();
        this.tickCount++;
        this.tickAccumulator -= this.tickInterval;
      }

      const tickInterp = this.tickAccumulator / this.tickInterval;
      const renderInfo: RenderInfo = {
        delta,
        tickInterp,
        tick: this.tickCount,
        tickWithInterp: this.tickCount + tickInterp,
      };

      this.render(renderInfo);
      this.lastRenderInfo = renderInfo;

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
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.save();
    this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const scene = $scene.get();
    scene.render(info, this.ctx);

    this.ctx.restore();
  }

  tick() {
    const scene = $scene.get();
    scene.tick();
  }

  /**
   * Gets the pointer position relative to the center of the canvas
   */
  getPointerPos(event: PointerEvent): Vector2 {
    const rect = this.ctx.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    return new Vector2(x, y);
  }

  getPointerInfo(event: PointerEvent): PointerInfo {
    return {
      pos: this.getPointerPos(event),
      leftButton: (event.buttons & 1) !== 0,
      rightButton: (event.buttons & 2) !== 0,
      middleButton: (event.buttons & 4) !== 0,
      shift: event.shiftKey,
      ctrl: event.ctrlKey,
      alt: event.altKey,
      event,
      eventType: event.type as "pointerdown" | "pointermove" | "pointerup",
    };
  }

  handlePointerDown(event: PointerEvent) {
    const scene = $scene.get();
    scene.pointerdown(this.getPointerInfo(event));
  }

  handlePointerMove(event: PointerEvent) {
    const scene = $scene.get();
    scene.pointermove(this.getPointerInfo(event));
  }

  handlePointerUp(event: PointerEvent) {
    const scene = $scene.get();
    scene.pointerup(this.getPointerInfo(event));
  }
}
