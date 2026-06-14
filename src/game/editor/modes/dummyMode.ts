import type { EditManager } from '../editManager';
import type { InteractionMode } from './interactionMode';

export class DummyMode implements InteractionMode {
  constructor(private editManager: EditManager) {}

  pointermove(): void {}
  pointerup(): void {
    this.editManager.setMode('select');
  }
  pointerdown(): void {}
}
