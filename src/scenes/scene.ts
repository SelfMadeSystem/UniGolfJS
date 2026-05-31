import type { CanvasRenderInfo, RenderInfo } from "@/render/drawable";
import type { PointerEventHandler, PointerInfo } from "@/render/pointerEvents";

export abstract class Scene implements PointerEventHandler {
  readonly key = Math.random();

  get playing(): boolean {
    return false;
  }

  get ui(): React.FC {
    return () => null;
  }

  pointerdown(info: PointerInfo<PointerEvent>): void {}
  pointermove(info: PointerInfo<PointerEvent>): void {}
  pointerup(info: PointerInfo<PointerEvent>): void {}
  pointerwheel?(info: PointerInfo<WheelEvent>): void {}
  keydown(event: KeyboardEvent): void {}

  tick(): void {}

  render(info: CanvasRenderInfo, ctx: CanvasRenderingContext2D): void {}

  dispose(): void {}
}
