import type { RenderInfo } from "@/render/drawable";
import type { PointerInfo } from "@/render/renderer";
import type { Vector2 } from "@/utils/vec";

export abstract class Scene {
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
