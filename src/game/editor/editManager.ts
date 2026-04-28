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

export class EditManager implements Drawable {
  public selectedObjects: Set<LevelObject> = new Set();
  public highlightedObject: LevelObject | null = null;

  constructor(public scene: EditScene) {}

  public selectObject(obj: LevelObject, multiSelect = false) {
    if (!multiSelect) {
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

  public getSelectedAABBs(): AABB[] {
    const aabbs: AABB[] = [];
    for (const obj of this.selectedObjects) {
      aabbs.push(obj.getAABB());
    }
    return aabbs;
  }

  render(info: RenderInfo): RenderPass[] {
    const passes: RenderPass[] = [];
    const aabb = this.getSelectedAABB();
    if (aabb) {
      const aabbs = this.getSelectedAABBs();
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

            if (aabbs.length <= 1) return;
            ctx.strokeStyle = "#FFFFFF";
            ctx.lineWidth = 1;
            for (const aabb of aabbs) {
              ctx.strokeRect(
                aabb.tl.x,
                aabb.tl.y,
                aabb.br.x - aabb.tl.x,
                aabb.br.y - aabb.tl.y,
              );
            }
          }),
        ],
      );
    }

    if (
      this.highlightedObject &&
      !this.selectedObjects.has(this.highlightedObject)
    ) {
      const aabb = this.highlightedObject.getAABB();
      passes.push(
        pass(LAYERS.EDITOR, (ctx) => {
          ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
          ctx.fillRect(
            aabb.tl.x,
            aabb.tl.y,
            aabb.br.x - aabb.tl.x,
            aabb.br.y - aabb.tl.y,
          );
        }),
      );
    }

    return passes;
  }

  pointermove(info: PointerInfo): void {
    const obj = this.scene.getObjectAtPointer(info);
    if (!(obj instanceof LevelObject)) {
      this.highlightedObject = null;
      document.body.style.cursor = "default";
      return;
    }
    this.highlightedObject = obj;
    document.body.style.cursor = "pointer";
  }

  pointerup(info: PointerInfo): void {}

  pointerdown(info: PointerInfo): void {
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
