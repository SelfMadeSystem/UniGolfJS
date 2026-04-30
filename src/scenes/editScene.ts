import type { Level } from "@/game/levelConfig";
import { LevelScene } from "./levelScene";
import { EditMenu } from "@/ui/EditMenu";
import { EditManager } from "@/game/editor/editManager";
import { EditorGrid } from "@/game/editor/editorGrid";
import type { PointerInfo } from "@/render/pointerEvents";
import { $selectedPlaceable } from "@/game/editor/state";
import { defaultPlaceable } from "@/game/editor/placeables";

export class EditScene extends LevelScene {
  public editManager: EditManager = new EditManager(this);
  public editorGrid: EditorGrid = new EditorGrid(25, this);

  constructor(level: Level) {
    super(level);
    this.drawables.push(this.editManager);
    this.drawables.push(this.editorGrid);
    $selectedPlaceable.set(defaultPlaceable);
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

  override pointerwheel(info: PointerInfo): void {
    if (!(info.event instanceof WheelEvent)) return;

    const scale = Math.exp(-info.event.deltaY * 0.001);
    const worldBefore = this.screenToWorld(info.pos);

    const newZoom = Math.max(0.1, Math.min(10, this.cameraZoom * scale));
    this.cameraZoom = newZoom;

    this.cameraPos = worldBefore.sub(info.pos.div(newZoom));

    info.event.preventDefault();
    info.event.stopPropagation();
  }
}
