import type { Level } from "@/game/levelConfig";
import { LevelScene } from "./levelScene";
import { EditMenu } from "@/ui/EditMenu";
import { EditManager } from "@/game/editor/editManager";
import { EditorGrid } from "@/game/editor/editorGrid";
import type { PointerInfo } from "@/render/pointerEvents";
import { $selectedPlaceable } from "@/game/editor/state";
import { defaultPlaceable } from "@/game/editor/placeables";
import { Vector2 } from "@/utils/vec";

export class EditScene extends LevelScene {
  public editManager: EditManager = new EditManager(this);
  public editorGrid: EditorGrid = new EditorGrid(25, this);
  private activePointers = new Map<number, Vector2>();
  private multiTouchState: {
    initialCentroid: Vector2;
    initialDistance: number;
    startZoom: number;
    worldAtInitialCentroid: Vector2;
  } | null = null;

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
    if (!(info.event instanceof PointerEvent)) {
      this.editManager.pointermove(info);
      return;
    }

    this.activePointers.set(info.event.pointerId, info.pos);

    if (this.activePointers.size >= 2) {
      const pointers = [...this.activePointers.values()];
      const firstPointer = pointers[0];
      const secondPointer = pointers[1];

      if (!firstPointer || !secondPointer) {
        return;
      }

      const centroid = new Vector2(
        (firstPointer.x + secondPointer.x) / 2,
        (firstPointer.y + secondPointer.y) / 2,
      );
      const distance = firstPointer.sub(secondPointer).length();

      if (!this.multiTouchState) {
        this.multiTouchState = {
          initialCentroid: centroid,
          initialDistance: distance,
          startZoom: this.cameraZoom,
          worldAtInitialCentroid: this.screenToWorld(centroid),
        };
      }

      if (this.multiTouchState) {
        const scale =
          distance / Math.max(this.multiTouchState.initialDistance, 0.0001);
        const newZoom = Math.max(
          0.1,
          Math.min(10, this.multiTouchState.startZoom * scale),
        );
        this.cameraZoom = newZoom;
        this.cameraPos = this.multiTouchState.worldAtInitialCentroid.sub(
          centroid.div(newZoom),
        );
      }

      info.event.preventDefault();
      info.event.stopPropagation();
      return;
    }

    this.multiTouchState = null;
    this.editManager.pointermove(info);
  }

  override pointerdown(info: PointerInfo): void {
    if (!(info.event instanceof PointerEvent)) {
      this.editManager.pointerdown(info);
      return;
    }

    this.activePointers.set(info.event.pointerId, info.pos);

    if (this.activePointers.size <= 1) {
      this.multiTouchState = null;
      this.editManager.pointerdown(info);
      return;
    }

    this.multiTouchState = null;
  }

  override pointerup(info: PointerInfo): void {
    if (!(info.event instanceof PointerEvent)) {
      this.editManager.pointerup(info);
      return;
    }

    this.activePointers.delete(info.event.pointerId);

    if (this.activePointers.size < 2) {
      this.multiTouchState = null;
      this.editManager.pointerup(info);
      return;
    }

    this.multiTouchState = null;
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

  override keydown(event: KeyboardEvent): void {
    this.editManager.handleKeyDown(event);
  }
}
