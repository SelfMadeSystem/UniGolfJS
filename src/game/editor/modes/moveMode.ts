import type { EditManager } from '../editManager';
import type { InteractionMode } from './interactionMode';
import { LevelObject } from '@/game/objects/levelObject';
import type { PointerInfo } from '@/render/pointerEvents';
import type { Vector2 } from '@/utils/vec';

export class MoveMode implements InteractionMode {
  public ogState: Map<LevelObject, Vector2> = new Map();
  public moved = false;

  constructor(private editManager: EditManager) {}

  pointermove(info: PointerInfo): void {
    const scene = this.editManager.scene;
    const pointerPos = scene.screenToWorld(info.pos);

    if (!this.editManager.startPointer) return;
    this.moved = true;

    const delta = pointerPos.sub(this.editManager.startPointer);
    for (const obj of this.editManager.selectedObjects) {
      obj.set('position', (obj.pos = obj.pos.add(delta)));
    }
    this.editManager.startPointer = pointerPos;
  }

  pointerup(info: PointerInfo): void {
    if (!this.moved) return;

    const newState = new Map<LevelObject, Vector2>();
    for (const obj of this.editManager.selectedObjects) {
      obj.editorSnapToGrid(this.editManager.scene.editorGrid.gridSize);
      obj.set('position', obj.pos);
      newState.set(obj, obj.pos);
    }

    this.editManager.startPointer = null;
    this.editManager.updateHighlight(info);
    this.editManager.setMode('select');

    for (const obj of this.editManager.selectedObjects) {
      obj.stopDragging();
    }

    const oldState = this.ogState;

    this.editManager.history.push({
      name: `Move ${this.editManager.selectedObjects.size} objects`,
      redo() {
        for (const [obj, pos] of newState) {
          obj.set('position', pos);
        }
      },
      undo() {
        for (const [obj, pos] of oldState) {
          obj.set('position', pos);
        }
      },
    });
  }

  pointerdown(info: PointerInfo): void {
    const scene = this.editManager.scene;
    this.editManager.startPointer = scene.screenToWorld(info.pos);
    this.ogState = new Map();
    this.moved = false;

    for (const obj of this.editManager.selectedObjects) {
      obj.startDragging();
      this.ogState.set(obj, obj.pos);
    }
  }
}
