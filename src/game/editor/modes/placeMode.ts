import type { InteractionMode } from "./interactionMode";
import type { PointerInfo } from "@/render/pointerEvents";
import type { EditManager } from "../editManager";
import { Vector2 } from "@/utils/vec";
import { AABB } from "@/utils/aabb";
import type { Placeable } from "../placeables";
import { LevelObject } from "@/game/objects/levelObject";
import { $selectedPlaceable } from "../state";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { LAYERS } from "@/game/levelConfig";

export class PlaceMode implements InteractionMode {
  private isPlacingSize = false;
  private isMovingExisting = false;

  constructor(private editManager: EditManager) {}

  *render(info: RenderInfo): Iterable<RenderPass> {
    if (!this.isPlacingSize) return;
    const selectionRegion = this.editManager.getSelectionRegionAABB();
    if (!selectionRegion) return;

    yield pass(LAYERS.EDITOR, (ctx) => {
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = "#FFFFFF";
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
    if (this.isMovingExisting) {
      this.editManager.moveMode.pointermove(info);
      return;
    }
    if (!this.isPlacingSize) return;
    const scene = this.editManager.scene;
    const pointerPos = scene.screenToWorld(info.pos);
    const snappedPointer = this.editManager.getSnappedPoint(pointerPos);
    this.editManager.selectionPointer = snappedPointer;
    this.editManager.updateHighlight(info);
  }

  pointerup(info: PointerInfo): void {
    if (this.isMovingExisting) {
      this.editManager.moveMode.pointerup(info);
      this.isMovingExisting = false;
      return;
    }
    if (!this.isPlacingSize) return;

    const scene = this.editManager.scene;
    const currentAABB = this.editManager.getSelectionRegionAABB();
    if (!currentAABB || currentAABB.size.x === 0 || currentAABB.size.y === 0) {
      this.isPlacingSize = false;
      return;
    }

    const placeable = $selectedPlaceable.get();
    if (!placeable) {
      console.warn("No placeable selected");
      this.isPlacingSize = false;
      return;
    }

    // @ts-expect-error can't be arsed to type this properly. can't initialize abstract classes but this'll never be an abstract class so whatever
    const newObj = new placeable.clazz({
      ...scene.level.config,
      ...placeable.props,
      position: currentAABB.center,
      scale: currentAABB.size,
    });
    scene.addObjectToLevel(newObj);

    this.editManager.deselectAll();
    this.editManager.selectObject(newObj, false);

    this.isPlacingSize = false;
  }

  pointerdown(info: PointerInfo): void {
    this.isPlacingSize = false;
    const scene = this.editManager.scene;
    const pointerPos = scene.screenToWorld(info.pos);

    // Check if clicking on already placed object
    const obj = scene.getObjectAtPointer(info);
    if (
      obj instanceof LevelObject &&
      this.editManager.selectedObjects.size === 1 &&
      this.editManager.selectedObjects.has(obj)
    ) {
      this.isMovingExisting = true;
      this.editManager.moveMode.pointerdown(info);
      return;
    }

    const placeable = $selectedPlaceable.get();

    if (!placeable) {
      console.warn("No placeable selected");
      return;
    }

    if (!placeable.noSize) {
      const snappedPointer = this.editManager.getSnappedPoint(pointerPos);
      this.isPlacingSize = true;
      this.editManager.startPointer = snappedPointer;
      this.editManager.selectionPointer = snappedPointer;
      this.editManager.updateHighlight(info);
      return;
    }

    // Place a new object
    // @ts-expect-error can't be arsed to type this properly. can't initialize abstract classes but this'll never be an abstract class so whatever
    const newObj = new placeable.clazz({
      ...scene.level.config,
      ...placeable.props,
      position: pointerPos,
    });
    scene.addObjectToLevel(newObj);

    // Select the new object
    this.editManager.deselectAll();
    this.editManager.selectObject(newObj, false);

    // Snap to grid
    newObj.editorSnapToGrid(scene.editorGrid.gridSize);
    newObj.set("position", newObj.pos);
  }
}
