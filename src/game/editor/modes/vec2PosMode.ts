import type { EditManager } from '../editManager';
import type { InteractionMode } from './interactionMode';
import { LAYERS } from '@/game/levelConfig';
import { type RenderPass, pass } from '@/render/drawable';
import type { PointerInfo } from '@/render/pointerEvents';
import { Vector2 } from '@/utils/vec';

export class Vec2PosMode implements InteractionMode {
  private lastPointer: Vector2 | null = null;

  constructor(
    private editManager: EditManager,
    public readonly currentPos: Vector2,
    public readonly relativeTo: Vector2,
    private readonly selectCb: (pos: Vector2) => void,
    private readonly exitCb: () => void,
    private readonly restoreMode: InteractionMode,
  ) {}

  onEnter(): void {
    // nothing
  }

  onExit(): void {
    this.exitCb();
  }

  pointermove(info: PointerInfo): void {
    const scene = this.editManager.scene;
    this.lastPointer = scene.screenToWorld(info.pos);
    if (!info.alt)
      this.lastPointer = this.editManager.getSnappedPoint(this.lastPointer);
  }

  pointerup(_info: PointerInfo): void {}

  pointerdown(info: PointerInfo): void {
    const scene = this.editManager.scene;
    let worldPos = scene.screenToWorld(info.pos);

    if (!info.alt) worldPos = this.editManager.getSnappedPoint(worldPos);

    this.selectCb(worldPos.sub(this.relativeTo));
    this.cancel();
  }

  public cancel(): void {
    this.editManager.currentMode = this.restoreMode;
  }

  *render(info: any): Iterable<RenderPass> {
    const cur = this.currentPos.add(this.relativeTo);
    const pointer = this.lastPointer;

    yield pass(LAYERS.EDITOR, (ctx: CanvasRenderingContext2D) => {
      ctx.save();
      // draw current position marker
      ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
      ctx.beginPath();
      ctx.arc(cur.x, cur.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#000000';
      ctx.stroke();

      if (pointer) {
        // draw preview crosshair at pointer
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(pointer.x - 10, pointer.y);
        ctx.lineTo(pointer.x + 10, pointer.y);
        ctx.moveTo(pointer.x, pointer.y - 10);
        ctx.lineTo(pointer.x, pointer.y + 10);
        ctx.stroke();
      }

      ctx.restore();
    });
  }
}
