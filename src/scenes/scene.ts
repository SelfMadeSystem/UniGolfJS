import type { RenderInfo } from "@/render/drawable";
import type { PointerEventHandler, PointerInfo } from "@/render/pointerEvents";

export abstract class Scene implements PointerEventHandler {
  readonly key = Math.random();

  get playing(): boolean {
    return false;
  }

  get ui(): React.FC {
    return () => null;
  }

  pointerdown(info: PointerInfo): void {}
  pointermove(info: PointerInfo): void {}
  pointerup(info: PointerInfo): void {}
  pointerwheel?(info: PointerInfo): void {}
  keydown(event: KeyboardEvent): void {}

  tick(): void {}

  render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {}

  dispose(): void {}
}
