import { $scene, getLevelScene } from "@/scenes/state";
import type { RenderInfo } from "./drawable";
import { Vector2 } from "@/utils/vec";
import { atom } from "nanostores";
import type { PointerInfo } from "./pointerEvents";

export const $renderer = atom<Renderer | null>(null);

export class Renderer {
  public readonly ctx: CanvasRenderingContext2D;
  private lastTime: number = 0;
  private requestId: number | null = null;
  private readonly tickInterval: number = 1000 / 30;
  private tickAccumulator: number = 0;
  private tickCount: number = 0;
  private readonly stopCbs: (() => void)[] = [];
  public lastRenderInfo: RenderInfo | null = null;
  private touchGestureState: {
    initialCentroid: Vector2;
    initialDistance: number;
    startZoom: number;
    startCameraPos: Vector2;
    worldAtInitialCentroid: Vector2;
  } | null = null;

  constructor(public readonly canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
    if (!this.ctx) {
      throw new Error("Failed to get 2D context");
    }
    if ($renderer.get()) {
      console.warn("Multiple renderers created, this may cause problems");
    }
    $renderer.set(this);
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
    const wheelHandler = (e: WheelEvent) => {
      if (e.target !== this.ctx.canvas) return;
      const scene = $scene.get();
      scene.pointerwheel?.({
        pos: this.getPointerPos(e),
        leftButton: false,
        rightButton: false,
        middleButton: false,
        shift: e.shiftKey,
        ctrl: e.ctrlKey,
        alt: e.altKey,
        event: e,
        eventType: "pointerwheel",
      });
    };

    window.addEventListener("pointerdown", pointerDownHandler);
    window.addEventListener("pointermove", pointerMoveHandler);
    window.addEventListener("pointerup", pointerUpHandler);
    // wheel on canvas for zoom towards pointer
    this.ctx.canvas.addEventListener("wheel", wheelHandler, { passive: false });

    const touchStartHandler = (e: TouchEvent) => {
      if (e.target !== this.ctx.canvas) return;
      // prevent touch from doing shenanigans
      e.preventDefault();
    };

    const touchMoveHandler = (e: TouchEvent) => {
      if (e.target !== this.ctx.canvas) return;
      if (e.touches.length < 1) return;

      const rect = this.ctx.canvas.getBoundingClientRect();

      const touchPos = (t: Touch) =>
        new Vector2(
          t.clientX - rect.left - rect.width / 2,
          t.clientY - rect.top - rect.height / 2,
        );

      if (e.touches.length === 1) {
        // single touch: forward as pointer events to scene
        const t = e.touches[0]!;
        const pos = touchPos(t);
        const pi = {
          pos,
          leftButton: true,
          rightButton: false,
          middleButton: false,
          shift: false,
          ctrl: false,
          alt: false,
          event: e,
          eventType: "touchmove",
        } as unknown as PointerInfo;
        const scene = $scene.get();
        scene.pointermove(pi);
        return;
      }

      // multitouch (use first two touches)
      const t0 = e.touches[0]!;
      const t1 = e.touches[1]!;
      const p0 = touchPos(t0);
      const p1 = touchPos(t1);
      const centroid = new Vector2((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
      const distance = p0.sub(p1).length();

      if (!this.touchGestureState) return;

      const level = getLevelScene();
      if (!level) return;

      const newZoom = Math.max(
        0.1,
        Math.min(
          10,
          this.touchGestureState.startZoom *
            (distance / this.touchGestureState.initialDistance),
        ),
      );
      level.cameraZoom = newZoom;

      // keep world point at initial centroid anchored, and move it to follow centroid movement
      level.cameraPos = this.touchGestureState.worldAtInitialCentroid.sub(
        centroid.div(newZoom),
      );

      e.preventDefault();
      e.stopPropagation();
    };

    const touchEndHandler = (e: TouchEvent) => {
      if (e.target !== this.ctx.canvas) return;
      if (!this.touchGestureState) return;

      // if fingers reduced to 1, start a single-finger pan state from current pointer
      if (e.touches.length === 1) {
        const rect = this.ctx.canvas.getBoundingClientRect();
        const t = e.touches[0]!;
        const pos = new Vector2(
          t.clientX - rect.left - rect.width / 2,
          t.clientY - rect.top - rect.height / 2,
        );
        const scene = $scene.get();
        scene.pointerdown({
          pos,
          leftButton: true,
          rightButton: false,
          middleButton: false,
          shift: false,
          ctrl: false,
          alt: false,
          event: e,
          eventType: "touchend",
        } as unknown as PointerInfo);
      }

      this.touchGestureState = null;
    };

    const touchStartFullHandler = (e: TouchEvent) => {
      if (e.target !== this.ctx.canvas) return;
      e.preventDefault();

      const rect = this.ctx.canvas.getBoundingClientRect();
      const touchPos = (t: Touch) =>
        new Vector2(
          t.clientX - rect.left - rect.width / 2,
          t.clientY - rect.top - rect.height / 2,
        );

      if (e.touches.length === 1) {
        const t = e.touches[0]!;
        const pos = touchPos(t);
        const pi = {
          pos,
          leftButton: true,
          rightButton: false,
          middleButton: false,
          shift: false,
          ctrl: false,
          alt: false,
          event: e,
          eventType: "touchstart",
        } as unknown as PointerInfo;
        const scene = $scene.get();
        scene.pointerdown(pi);
        return;
      }

      if (e.touches.length >= 2) {
        const t0 = e.touches[0]!;
        const t1 = e.touches[1]!;
        const p0 = touchPos(t0);
        const p1 = touchPos(t1);
        const centroid = new Vector2((p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
        const distance = p0.sub(p1).length();

        const level = getLevelScene();
        if (!level) return;

        this.touchGestureState = {
          initialCentroid: centroid,
          initialDistance: distance,
          startZoom: level.cameraZoom,
          startCameraPos: level.cameraPos,
          worldAtInitialCentroid: level.screenToWorld(centroid),
        };
      }
    };

    window.addEventListener("touchstart", touchStartFullHandler, {
      passive: false,
    });
    window.addEventListener("touchmove", touchMoveHandler, { passive: false });
    window.addEventListener("touchend", touchEndHandler);

    this.stopCbs.push(() => {
      window.removeEventListener("touchstart", touchStartFullHandler);
      window.removeEventListener("touchmove", touchMoveHandler);
      window.removeEventListener("touchend", touchEndHandler);
    });

    this.stopCbs.push(() => {
      window.removeEventListener("pointerdown", pointerDownHandler);
      window.removeEventListener("pointermove", pointerMoveHandler);
      window.removeEventListener("pointerup", pointerUpHandler);
      this.ctx.canvas.removeEventListener(
        "wheel",
        wheelHandler as EventListener,
      );
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
  getPointerPos(event: { clientX: number; clientY: number }): Vector2 {
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
    // only trigger if the pointer is on the canvas
    if (event.target !== this.ctx.canvas) return;
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
