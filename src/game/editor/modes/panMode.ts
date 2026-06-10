import type { EditManager } from '../editManager';
import type { InteractionMode } from './interactionMode';
import type { PointerInfo } from '@/render/pointerEvents';

export class PanMode implements InteractionMode {
  constructor(private editManager: EditManager) {}

  pointermove(info: PointerInfo): void {
    const scene = this.editManager.scene;
    const pointerPos = scene.screenToWorld(info.pos);

    if (!this.editManager.startPointer) return;

    const delta = pointerPos.sub(this.editManager.startPointer);
    scene.cameraPos = scene.cameraPos.sub(delta);
  }

  pointerup(info: PointerInfo): void {
    this.editManager.startPointer = null;
  }

  pointerdown(info: PointerInfo): void {
    const scene = this.editManager.scene;
    this.editManager.startPointer = scene.screenToWorld(info.pos);
  }
}
