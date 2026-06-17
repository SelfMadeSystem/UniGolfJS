import { $hasRedo, $hasUndo } from '@/stores/history';

export type HistoryState = {
  name: string;
  redo(): void;
  undo(): void;
};

export class HistoryManager {
  public readonly undoStack: HistoryState[] = [];
  public readonly redoStack: HistoryState[] = [];

  public get latest(): HistoryState | null {
    if (this.redoStack.length > 0) return null;
    return this.undoStack.at(-1) ?? null;
  }

  protected updateHistoryState() {
    $hasUndo.set(this.undoStack.length > 0);
    $hasRedo.set(this.redoStack.length > 0);
  }

  public push(state: HistoryState) {
    this.undoStack.push(state);
    this.redoStack.length = 0;
    this.updateHistoryState();
  }

  public undo() {
    const state = this.undoStack.pop();
    if (!state) return;
    state.undo();
    this.redoStack.push(state);
    this.updateHistoryState();
  }

  public redo() {
    const state = this.redoStack.pop();
    if (!state) return;
    state.redo();
    this.undoStack.push(state);
    this.updateHistoryState();
  }
}
