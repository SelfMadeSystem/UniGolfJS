import {
  pass,
  type Drawable,
  type RenderInfo,
  type RenderPass,
} from "@/render/drawable";
import { LevelObject } from "../objects/levelObject";
import { AABB } from "@/utils/aabb";
import { LAYERS } from "../levelConfig";
import type { EditScene } from "@/scenes/editScene";
import { Vector2 } from "@/utils/vec";
import { HandlesManager } from "./handles";
import type { PointerEventHandler, PointerInfo } from "@/render/pointerEvents";

export class EditManager implements Drawable, PointerEventHandler {
  public selectedObjects: Set<LevelObject> = new Set();
  public highlightedObject: LevelObject | null = null;
  /** world coordinates */
  public startPointer: Vector2 | null = null;
  public interactionMode: "move" | "resize" | "select" | null = null;
  public selectionPointer: Vector2 | null = null;
  public handles: HandlesManager | null = null;

  constructor(public scene: EditScene) {}

  initHandles(): HandlesManager {
    if (!this.handles) this.handles = new HandlesManager(this.scene);
    return this.handles;
  }

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

  // rotate / resize handle geometry and hit-testing moved to EditorHandles

  private rotateSelectionCCW(): void {
    if (this.selectedObjects.size === 0) return;
    const aabb = this.getSelectedAABB();
    if (!aabb) return;
    if (this.selectedObjects.size === 1) {
      // single object: rotate shape (AABB stays same)
      const obj = [...this.selectedObjects][0]!;
      obj.editorRotateShapeCCW();
      return;
    }
    const center = aabb.center;
    for (const obj of this.selectedObjects) {
      const rel = obj.pos.sub(center);
      const relRot = new Vector2(rel.y, -rel.x); // CCW 90
      obj.pos = center.add(relRot);
      obj.editorRotateCCW();
      obj.set("position", obj.pos);
    }
  }

  private rotateSelectionCW(): void {
    if (this.selectedObjects.size === 0) return;
    const aabb = this.getSelectedAABB();
    if (!aabb) return;
    if (this.selectedObjects.size === 1) {
      const obj = [...this.selectedObjects][0]!;
      obj.editorRotateShapeCW();
      return;
    }
    const center = aabb.center;
    for (const obj of this.selectedObjects) {
      const rel = obj.pos.sub(center);
      const relRot = new Vector2(-rel.y, rel.x); // CW 90
      obj.pos = center.add(relRot);
      obj.editorRotateCW();
      obj.set("position", obj.pos);
    }
  }

  private getSnappedPoint(point: Vector2): Vector2 {
    const gridSize = this.scene.editorGrid.gridSize;
    return new Vector2(
      Math.round(point.x / gridSize) * gridSize,
      Math.round(point.y / gridSize) * gridSize,
    );
  }

  private transformSelectionAABB(sourceAABB: AABB, targetAABB: AABB): void {
    if (this.selectedObjects.size === 0) return;

    const sourceSize = sourceAABB.size;
    const targetSize = targetAABB.size;
    const scale = new Vector2(
      sourceSize.x === 0 ? 1 : targetSize.x / sourceSize.x,
      sourceSize.y === 0 ? 1 : targetSize.y / sourceSize.y,
    );

    for (const obj of this.selectedObjects) {
      const relPos = obj.pos.sub(sourceAABB.tl);
      obj.pos = targetAABB.tl.add(relPos.mult(scale));
      obj.editorScale(scale);
    }
  }

  private getSelectionRegionAABB(): AABB | null {
    if (!this.startPointer || !this.selectionPointer) return null;
    return new AABB(this.startPointer, this.selectionPointer);
  }

  private applySelectionRegion(addToSelection: boolean): void {
    const region = this.getSelectionRegionAABB();
    if (!region) return;

    if (!addToSelection) {
      this.deselectAll();
    }

    for (const obj of [...this.scene.objects]) {
      if (!(obj instanceof LevelObject)) continue;
      const aabb = obj.getAABB();
      if (region.containsAABB(aabb)) {
        this.selectObject(obj, true);
      }
    }
  }

  // delegated to EditorHandles

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
      // draw handles via the handles helper
      const handles = this.handles ?? this.initHandles();
      passes.push(...handles.render(aabb, info));
    }

    const selectionRegion = this.getSelectionRegionAABB();
    if (selectionRegion && this.interactionMode === "select") {
      passes.push(
        pass(LAYERS.EDITOR, (ctx) => {
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
        }),
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
    const pointerPos = this.scene.screenToWorld(info.pos);
    const selectedAABB = this.getSelectedAABB();
    if (selectedAABB) {
      const handles = this.handles ?? this.initHandles();
      const hit = handles.hitTest(pointerPos, selectedAABB);
      if (hit) {
        this.highlightedObject = null;
        document.body.style.cursor = hit.cursor();
        return;
      }
    }

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
    if (this.interactionMode === "select") {
      this.selectionPointer = this.scene.screenToWorld(info.pos);
      this.updateHighlight(info);
      return;
    }

    if (!this.startPointer) {
      this.updateHighlight(info);
      return;
    }

    const pointerPos = this.scene.screenToWorld(info.pos);
    if (this.interactionMode === "resize") {
      const sourceAABB = this.getSelectedAABB();
      if (!sourceAABB) return;

      const minSize = 1;
      const targetBR = new Vector2(
        Math.max(pointerPos.x, sourceAABB.tl.x + minSize),
        Math.max(pointerPos.y, sourceAABB.tl.y + minSize),
      );
      const targetAABB = new AABB(sourceAABB.tl, targetBR);
      this.transformSelectionAABB(sourceAABB, targetAABB);
      return;
    }

    if (this.interactionMode === "move") {
      const delta = pointerPos.sub(this.startPointer);
      for (const obj of this.selectedObjects) {
        obj.pos = obj.pos.add(delta);
      }
      this.startPointer = pointerPos;
    }
  }

  pointerup(info: PointerInfo): void {
    if (this.interactionMode === "select") {
      this.selectionPointer = this.scene.screenToWorld(info.pos);
      this.applySelectionRegion(info.shift);
      this.startPointer = null;
      this.selectionPointer = null;
      this.interactionMode = null;
      this.updateHighlight(info);
      return;
    }

    if (this.interactionMode === "resize") {
      const currentAABB = this.getSelectedAABB();
      if (currentAABB) {
        const snappedTL = this.getSnappedPoint(currentAABB.tl);
        const snappedBR = this.getSnappedPoint(currentAABB.br);
        const minSize = this.scene.editorGrid.gridSize;
        const targetAABB = new AABB(
          snappedTL,
          new Vector2(
            Math.max(snappedBR.x, snappedTL.x + minSize),
            Math.max(snappedBR.y, snappedTL.y + minSize),
          ),
        );
        this.transformSelectionAABB(currentAABB, targetAABB);
      }

      for (const obj of this.selectedObjects) {
        obj.set("position", obj.pos);
      }
    } else if (this.interactionMode === "move") {
      for (const obj of this.selectedObjects) {
        obj.editorSnapToGrid(this.scene.editorGrid.gridSize);
        obj.set("position", obj.pos);
      }
    }

    this.startPointer = null;
    this.selectionPointer = null;
    this.interactionMode = null;
    this.updateHighlight(info);
  }

  pointerdown(info: PointerInfo): void {
    const pointerPos = this.scene.screenToWorld(info.pos);

    const selectedAABB = this.getSelectedAABB();
    if (selectedAABB) {
      const handles = this.handles ?? this.initHandles();
      const hit = handles.hitTest(pointerPos, selectedAABB);
      if (hit) {
        const act = hit.action();
        if (act === "resize") {
          this.startPointer = pointerPos;
          this.interactionMode = "resize";
          return;
        }
        if (act === "rotateCCW") {
          this.rotateSelectionCCW();
          return;
        }
        if (act === "rotateCW") {
          this.rotateSelectionCW();
          return;
        }
      }
    }

    const obj = this.scene.getObjectAtPointer(info);
    if (!(obj instanceof LevelObject)) {
      this.startPointer = pointerPos;
      this.interactionMode = "select";
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

    this.startPointer = pointerPos;
    this.interactionMode = "move";
  }
}
