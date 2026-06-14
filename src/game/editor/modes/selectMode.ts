import type { EditManager } from '../editManager';
import type { InteractionMode } from './interactionMode';
import { LAYERS } from '@/game/levelConfig';
import { LevelObject } from '@/game/objects/levelObject';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import type { PointerInfo } from '@/render/pointerEvents';

export class SelectMode implements InteractionMode {
  constructor(private editManager: EditManager) {}

  onEnter(): void {
    this.editManager.startPointer = null;
    this.editManager.selectionPointer = null;
  }

  *render(info: RenderInfo): Iterable<RenderPass> {
    const selectionRegion = this.editManager.getSelectionRegionAABB();
    if (!selectionRegion) return;

    yield pass(LAYERS.EDITOR, ctx => {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.fillRect(
        selectionRegion.tl.x,
        selectionRegion.tl.y,
        selectionRegion.br.x - selectionRegion.tl.x,
        selectionRegion.br.y - selectionRegion.tl.y,
      );
      ctx.strokeRect(
        selectionRegion.tl.x,
        selectionRegion.tl.y,
        selectionRegion.br.x - selectionRegion.tl.x,
        selectionRegion.br.y - selectionRegion.tl.y,
      );
      ctx.restore();
    });
  }

  pointermove(info: PointerInfo): void {
    const scene = this.editManager.scene;
    this.editManager.selectionPointer = scene.screenToWorld(info.pos);
    this.editManager.updateHighlight(info);
  }

  pointerup(info: PointerInfo): void {
    const scene = this.editManager.scene;
    this.editManager.selectionPointer = scene.screenToWorld(info.pos);

    const region = this.editManager.getSelectionRegionAABB();
    if (!region) return;

    if (!info.shift) {
      this.editManager.deselectAll();
    }

    for (const obj of [...scene.objects]) {
      if (!(obj instanceof LevelObject)) continue;
      const aabb = obj.getAABB();
      if (region.containsAABB(aabb)) {
        this.editManager.selectObject(obj, true);
      }
    }

    this.editManager.startPointer = null;
    this.editManager.selectionPointer = null;
  }

  pointerdown(info: PointerInfo): void {
    const scene = this.editManager.scene;
    const pointerPos = scene.screenToWorld(info.pos);
    this.editManager.startPointer = pointerPos;
  }
}
