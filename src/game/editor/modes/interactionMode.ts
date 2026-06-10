import type { RenderInfo, RenderPass } from '@/render/drawable';
import type { PointerInfo } from '@/render/pointerEvents';

export interface InteractionMode {
  render?(info: RenderInfo): Iterable<RenderPass>;
  pointermove(info: PointerInfo): void;
  pointerup(info: PointerInfo): void;
  pointerdown(info: PointerInfo): void;
  onEnter?(): void;
  onExit?(): void;
}
