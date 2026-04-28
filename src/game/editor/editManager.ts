import {
  pass,
  type Drawable,
  type RenderInfo,
  type RenderPass,
} from "@/render/drawable";
import { LevelObject } from "../objects/levelObject";
import type { PointerInfo } from "@/render/renderer";
import { AABB } from "@/utils/aabb";
import { LAYERS } from "../levelConfig";
import type { EditScene } from "@/scenes/editScene";
import { Vector2 } from "@/utils/vec";

export class EditManager implements Drawable {
  public selectedObjects: Set<LevelObject> = new Set();
  public highlightedObject: LevelObject | null = null;
  /** world coordinates */
  public startPointer: Vector2 | null = null;

  constructor(public scene: EditScene) {}

  public selectObject(obj: LevelObject, multiSelect = false) {
    if (!multiSelect && !this.selectedObjects.has(obj)) {
      this.deselectAll();
    }
    this.selectedObjects.add(obj);
    this.scene.moveObjectToTop(obj);
  }

  public deselectObject(obj: LevelObject) {
    this.selectedObjects.delete(obj);
    this.scene.moveObjectToBottom(obj);
  }

  public deselectAll() {
    for (const obj of this.selectedObjects) {
      this.scene.moveObjectToBottom(obj);
    }
    this.selectedObjects.clear();
  }

  public getSelectedAABB(): AABB | null {
    let aabb: AABB | null = null;
    for (const obj of this.selectedObjects) {
      const objAABB = obj.getAABB();
      if (!aabb) {
        aabb = objAABB;
      } else {
        aabb = aabb.expandToIncludeAABB(objAABB);
      }
    }
    return aabb;
  }

  render(info: RenderInfo): RenderPass[] {
    const passes: RenderPass[] = [];
    const aabb = this.getSelectedAABB();
    if (aabb) {
      passes.push(
        ...[
          pass(LAYERS.EDITOR, (ctx) => {
            ctx.save();
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.lineDashOffset = info.tickWithInterp;
            ctx.strokeRect(
              aabb.tl.x,
              aabb.tl.y,
              aabb.br.x - aabb.tl.x,
              aabb.br.y - aabb.tl.y,
            );
            ctx.restore();

            if (this.selectedObjects.size <= 1) return;
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1;
            for (const obj of this.selectedObjects) {
              const path = obj.getPath();
              ctx.stroke(path);
            }
          }),
        ],
      );
    }

    if (
      this.highlightedObject &&
      !this.selectedObjects.has(this.highlightedObject)
    ) {
      const path = this.highlightedObject.getPath();
      passes.push(
        pass(LAYERS.EDITOR, (ctx) => {
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.fill(path);
        }),
      );
    }

    return passes;
  }

  updateHighlight(info: PointerInfo) {
    const obj = this.scene.getObjectAtPointer(info);
    if (obj instanceof LevelObject) {
      this.highlightedObject = obj;
      document.body.style.cursor = "pointer";
    } else {
      this.highlightedObject = null;
      document.body.style.cursor = "default";
    }
  }

  pointermove(info: PointerInfo): void {
    this.updateHighlight(info);

    if (this.startPointer) {
      const pointerPos = this.scene.screenToWorld(info.pos);
      const delta = pointerPos.sub(this.startPointer);
      for (const obj of this.selectedObjects) {
        obj.pos = obj.pos.add(delta);
      }
      this.startPointer = pointerPos;
    }
  }

  pointerup(info: PointerInfo): void {
    this.startPointer = null;

    for (const obj of this.selectedObjects) {
      obj.editorSnapToGrid(this.scene.editorGrid.gridSize);
      obj.set("position", obj.pos);
    }
  }

  pointerdown(info: PointerInfo): void {
    const pointerPos = this.scene.screenToWorld(info.pos);
    this.startPointer = pointerPos;

    const obj = this.scene.getObjectAtPointer(info);
    if (!(obj instanceof LevelObject)) {
      this.deselectAll();
      return;
    }

    if (info.shift) {
      if (this.selectedObjects.has(obj)) {
        this.deselectObject(obj);
      } else {
        this.selectObject(obj, true);
      }
    } else {
      this.selectObject(obj, false);
    }
  }
}
