import type { Level } from "@/game/levelConfig";
import { LevelScene } from "./levelScene";
import { EditMenu } from "@/ui/EditMenu";
import { EditManager } from "@/game/editor/editManager";
import { EditorGrid } from "@/game/editor/editorGrid";
import type { PointerInfo } from "@/render/pointerEvents";
import { $selectedPlaceable } from "@/game/editor/state";

export class EditScene extends LevelScene {
  public editManager: EditManager = new EditManager(this);
  public editorGrid: EditorGrid = new EditorGrid(25, this);

  constructor(level: Level) {
    super(level);
    this.resetAllObjects();
    this.drawables.push(this.editManager);
    this.drawables.push(this.editorGrid);
    $selectedPlaceable.set(null);
  }

  override get ui() {
    return EditMenu;
  }

  override pointermove(info: PointerInfo): void {
    this.editManager.pointermove(info);
  }

  override pointerup(info: PointerInfo): void {
    this.editManager.pointerup(info);
  }

  override pointerdown(info: PointerInfo): void {
    this.editManager.pointerdown(info);
  }
}
