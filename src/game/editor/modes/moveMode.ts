import type { EditManager } from '../editManager';
import type { InteractionMode } from './interactionMode';
import type { PointerInfo } from '@/render/pointerEvents';

export class MoveMode implements InteractionMode {
  constructor(private editManager: EditManager) {}

  pointermove(info: PointerInfo): void {
    const scene = this.editManager.scene;
    const pointerPos = scene.screenToWorld(info.pos);

    if (!this.editManager.startPointer) return;

    const delta = pointerPos.sub(this.editManager.startPointer);
    for (const obj of this.editManager.selectedObjects) {
      obj.set('position', (obj.pos = obj.pos.add(delta)));
    }
    this.editManager.startPointer = pointerPos;
  }

  pointerup(info: PointerInfo): void {
    for (const obj of this.editManager.selectedObjects) {
      obj.editorSnapToGrid(this.editManager.scene.editorGrid.gridSize);
      obj.set('position', obj.pos);
    }

    this.editManager.startPointer = null;
    this.editManager.updateHighlight(info);
    this.editManager.setMode('select');

    for (const obj of this.editManager.selectedObjects) {
      obj.stopDragging();
    }
  }

  pointerdown(info: PointerInfo): void {
    const scene = this.editManager.scene;
    this.editManager.startPointer = scene.screenToWorld(info.pos);

    for (const obj of this.editManager.selectedObjects) {
      obj.startDragging();
    }
  }
}
