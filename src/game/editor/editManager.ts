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
import type { InteractionMode } from "./modes/interactionMode";
import { SelectMode } from "./modes/selectMode";
import { MoveMode } from "./modes/moveMode";
import { ResizeMode } from "./modes/resizeMode";
import { PlaceMode } from "./modes/placeMode";

export class EditManager implements Drawable, PointerEventHandler {
  public selectedObjects: Set<LevelObject> = new Set();
  public highlightedObject: LevelObject | null = null;
  /** world coordinates */
  public startPointer: Vector2 | null = null;
  public selectionPointer: Vector2 | null = null;
  public handles: HandlesManager | null = null;

  public inPlaceMode = false;

  public currentMode: InteractionMode;
  public selectMode: SelectMode;
  public moveMode: MoveMode;
  public resizeMode: ResizeMode;
  public placeMode: PlaceMode;

  constructor(public scene: EditScene) {
    this.selectMode = new SelectMode(this);
    this.moveMode = new MoveMode(this);
    this.resizeMode = new ResizeMode(this);
    this.placeMode = new PlaceMode(this);
    this.currentMode = this.selectMode;
  }

  initHandles(): HandlesManager {
    if (!this.handles) this.handles = new HandlesManager(this.scene);
    return this.handles;
  }

  // ===== Selection Management =====
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

  // ===== Mode Management =====
  public setMode(mode: "select" | "move" | "resize" | "place"): void {
    this.currentMode?.onExit?.();
    switch (mode) {
      case "select":
        this.currentMode = this.selectMode;
        break;
      case "move":
        this.currentMode = this.moveMode;
        break;
      case "resize":
        this.currentMode = this.resizeMode;
        break;
      case "place":
        this.currentMode = this.placeMode;
        break;
    }
    this.currentMode?.onEnter?.();
  }

  public enablePlaceMode() {
    this.inPlaceMode = true;
    this.setMode("place");
  }

  public disablePlaceMode() {
    this.inPlaceMode = false;
    this.setMode("select");
  }

  // ===== AABB Utilities =====
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

  public getSelectionRegionAABB(): AABB | null {
    if (!this.startPointer || !this.selectionPointer) return null;
    return new AABB(this.startPointer, this.selectionPointer);
  }

  public getSnappedPoint(point: Vector2): Vector2 {
    const gridSize = this.scene.editorGrid.gridSize;
    return new Vector2(
      Math.round(point.x / gridSize) * gridSize,
      Math.round(point.y / gridSize) * gridSize,
    );
  }

  public transformSelectionAABB(sourceAABB: AABB, targetAABB: AABB): void {
    if (this.selectedObjects.size === 0) return;

    const sourceSize = sourceAABB.size;
    const targetSize = targetAABB.size;
    const scale = new Vector2(
      sourceSize.x === 0 ? 1 : targetSize.x / sourceSize.x,
      sourceSize.y === 0 ? 1 : targetSize.y / sourceSize.y,
    );

    for (const obj of this.selectedObjects) {
      const relPos = obj.pos.sub(sourceAABB.tl);
      obj.set("position", (obj.pos = targetAABB.tl.add(relPos.mult(scale))));
      obj.editorScale(scale);
    }
  }

  // ===== Rotation (for handles) =====
  public rotateSelectionCCW(): void {
    if (this.selectedObjects.size === 0) return;
    const aabb = this.getSelectedAABB();
    if (!aabb) return;
    if (this.selectedObjects.size === 1) {
      const obj = [...this.selectedObjects][0]!;
      obj.editorRotateShapeCCW();
      return;
    }
    const center = aabb.center;
    for (const obj of this.selectedObjects) {
      const rel = obj.pos.sub(center);
      const relRot = new Vector2(rel.y, -rel.x); // CCW 90
      obj.editorRotateCCW();
      obj.set("position", (obj.pos = center.add(relRot)));
    }
  }

  public rotateSelectionCW(): void {
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
      obj.editorRotateCW();
      obj.set("position", (obj.pos = center.add(relRot)));
    }
  }

  // delegated to EditorHandles

  *render(info: RenderInfo): Iterable<RenderPass> {
    const aabb = this.getSelectedAABB();
    if (aabb) {
      yield pass(LAYERS.EDITOR, (ctx) => {
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
      });
      // draw handles via the handles helper
      const handles = this.handles ?? this.initHandles();
      yield* handles.render(aabb, info);
    }

    if (this.currentMode.render) {
      yield* this.currentMode.render(info);
    }

    if (
      this.highlightedObject &&
      !this.selectedObjects.has(this.highlightedObject)
    ) {
      const path = this.highlightedObject.getPath();
      yield pass(LAYERS.EDITOR, (ctx) => {
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.fill(path);
      });
    }
  }

  public updateHighlight(info: PointerInfo) {
    const pointerPos = this.scene.screenToWorld(info.pos);
    const selectedAABB = this.getSelectedAABB();
    if (selectedAABB) {
      const handles = this.handles ?? this.initHandles();
      const hit = handles.hitTest(pointerPos, selectedAABB);
      if (hit) {
        this.highlightedObject = null;
        return;
      }
    }

    const obj = this.scene.getObjectAtPointer(info);
    if (obj instanceof LevelObject) {
      this.highlightedObject = obj;
    } else {
      this.highlightedObject = null;
    }
  }

  // ===== Event Handlers =====
  pointermove(info: PointerInfo): void {
    this.currentMode.pointermove(info);
  }

  pointerup(info: PointerInfo): void {
    this.currentMode.pointerup(info);
  }

  pointerdown(info: PointerInfo): void {
    const pointerPos = this.scene.screenToWorld(info.pos);

    // Check for handle hits first
    const selectedAABB = this.getSelectedAABB();
    if (selectedAABB) {
      const handles = this.handles ?? this.initHandles();
      const hit = handles.hitTest(pointerPos, selectedAABB);
      if (hit) {
        const act = hit.action();
        switch (act) {
          case "delete":
            for (const obj of this.selectedObjects) {
              obj.delete(true);
            }
            this.selectedObjects.clear();
            this.highlightedObject = null;
            return;
          case "rotateCCW":
            this.rotateSelectionCCW();
            return;
          case "rotateCW":
            this.rotateSelectionCW();
            return;
          case "resize":
            this.startPointer = pointerPos;
            this.setMode("resize");
            this.currentMode.pointerdown(info);
            return;
          default:
            console.warn("Unknown handle action:", act);
            return;
        }
      }
    }

    if (this.inPlaceMode) {
      this.currentMode = this.placeMode;
      this.startPointer = pointerPos;
      this.selectionPointer = pointerPos;
      this.currentMode.pointerdown(info);
      return;
    }

    // Check for object selection
    const obj = this.scene.getObjectAtPointer(info);
    if (obj instanceof LevelObject) {
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
      this.setMode("move");
    } else {
      // Empty space - start selection drag
      this.startPointer = pointerPos;
      this.selectionPointer = pointerPos;
      this.setMode("select");
    }

    this.currentMode.pointerdown(info);
  }
}
