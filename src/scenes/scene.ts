import type { RenderInfo } from "@/render/drawable";

export abstract class Scene {
  readonly key = Math.random();

  get ui(): React.FC {
    return () => null;
  }

  pointerdown(x: number, y: number): void {}
  pointermove(x: number, y: number): void {}
  pointerup(x: number, y: number): void {}

  tick(): void {}

  render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {}

  dispose(): void {}
}
