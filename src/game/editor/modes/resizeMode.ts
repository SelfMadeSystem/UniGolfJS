import type { InteractionMode } from "./interactionMode";
import type { PointerInfo } from "@/render/pointerEvents";
import { Vector2 } from "@/utils/vec";
import { AABB } from "@/utils/aabb";
import type { EditManager } from "../editManager";

export class ResizeMode implements InteractionMode {
  constructor(private editManager: EditManager) {}

  pointermove(info: PointerInfo): void {
    const scene = this.editManager.scene;
    const pointerPos = scene.screenToWorld(info.pos);

    if (!this.editManager.startPointer) return;

    const sourceAABB = this.editManager.getSelectedAABB();
    if (!sourceAABB) return;

    const minSize = 1;
    const targetBR = new Vector2(
      Math.max(pointerPos.x, sourceAABB.tl.x + minSize),
      Math.max(pointerPos.y, sourceAABB.tl.y + minSize),
    );
    const targetAABB = new AABB(sourceAABB.tl, targetBR);
    this.editManager.transformSelectionAABB(sourceAABB, targetAABB);
  }

  pointerup(info: PointerInfo): void {
    const scene = this.editManager.scene;
    const currentAABB = this.editManager.getSelectedAABB();
    if (currentAABB) {
      const snappedTL = this.editManager.getSnappedPoint(currentAABB.tl);
      const snappedBR = this.editManager.getSnappedPoint(currentAABB.br);
      const minSize = scene.editorGrid.gridSize;
      const targetAABB = new AABB(
        snappedTL,
        new Vector2(
          Math.max(snappedBR.x, snappedTL.x + minSize),
          Math.max(snappedBR.y, snappedTL.y + minSize),
        ),
      );
      this.editManager.transformSelectionAABB(currentAABB, targetAABB);
    }

    for (const obj of this.editManager.selectedObjects) {
      obj.set("position", obj.pos);
    }

    this.editManager.startPointer = null;
    this.editManager.updateHighlight(info);
  }

  pointerdown(info: PointerInfo): void {
    // Shouldn't happen
  }
}
