import type { RenderInfo } from "@/render/drawable";
import type { PointerEventHandler, PointerInfo } from "@/render/pointerEvents";

export abstract class Scene implements PointerEventHandler {
  readonly key = Math.random();

  get ui(): React.FC {
    return () => null;
  }

  pointerdown(info: PointerInfo): void {}
  pointermove(info: PointerInfo): void {}
  pointerup(info: PointerInfo): void {}

  tick(): void {}

  render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {}

  dispose(): void {}
}
