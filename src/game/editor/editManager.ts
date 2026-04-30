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
import { PanMode } from "./modes/panMode";
import { syncSelectedObjects } from "./state";

export type Tool = "select" | "place" | "pan";

export class EditManager implements Drawable, PointerEventHandler {
  private selectedObjectsInternal: Set<LevelObject> = new Set();
  public highlightedObject: LevelObject | null = null;
  /** world coordinates */
  public startPointer: Vector2 | null = null;
  public selectionPointer: Vector2 | null = null;
  public handles: HandlesManager | null = null;

  public selectedTool: Tool = "select";

  public overrideMode = false;
  public currentMode: InteractionMode;
  public selectMode: SelectMode;
  public moveMode: MoveMode;
  public resizeMode: ResizeMode;
  public placeMode: PlaceMode;
  public panMode: PanMode;

  constructor(public scene: EditScene) {
    this.selectMode = new SelectMode(this);
    this.moveMode = new MoveMode(this);
    this.resizeMode = new ResizeMode(this);
    this.placeMode = new PlaceMode(this);
    this.panMode = new PanMode(this);
    this.currentMode = this.selectMode;
    syncSelectedObjects(this.selectedObjectsInternal);
  }

  public get selectedObjects(): Set<LevelObject> {
    return new Set(this.selectedObjectsInternal);
  }

  initHandles(): HandlesManager {
    if (!this.handles) this.handles = new HandlesManager(this.scene);
    return this.handles;
  }

  private syncSelectedObjects(): void {
    syncSelectedObjects(this.selectedObjectsInternal);
  }

  // ===== Selection Management =====
  public selectObject(obj: LevelObject, multiSelect = false) {
    if (!multiSelect && !this.selectedObjectsInternal.has(obj)) {
      this.deselectAll();
    }
    this.selectedObjectsInternal.add(obj);
    this.syncSelectedObjects();
    this.scene.moveObjectToTop(obj);
  }

  public deselectObject(obj: LevelObject) {
    this.selectedObjectsInternal.delete(obj);
    this.syncSelectedObjects();
    this.scene.moveObjectToBottom(obj);
  }

  public deselectAll() {
    for (const obj of this.selectedObjectsInternal) {
      this.scene.moveObjectToBottom(obj);
    }
    this.selectedObjectsInternal.clear();
    this.syncSelectedObjects();
  }

  public clearSelection(): void {
    this.selectedObjectsInternal.clear();
    this.syncSelectedObjects();
  }

  // ===== Mode Management =====
  public setMode(mode: "select" | "move" | "resize" | "place" | "pan"): void {
    this.setInteractionMode(
      {
        select: this.selectMode,
        move: this.moveMode,
        resize: this.resizeMode,
        place: this.placeMode,
        pan: this.panMode,
      }[mode],
    );
  }

  public setInteractionMode(mode: InteractionMode): void {
    this.currentMode?.onExit?.();
    this.currentMode = mode;
    this.currentMode?.onEnter?.();
  }

  // ===== AABB Utilities =====
  public getSelectedAABB(): AABB | null {
    let aabb: AABB | null = null;
    for (const obj of this.selectedObjectsInternal) {
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
    if (this.selectedObjectsInternal.size === 0) return;

    const sourceSize = sourceAABB.size;
    const targetSize = targetAABB.size;
    const scale = new Vector2(
      sourceSize.x === 0 ? 1 : targetSize.x / sourceSize.x,
      sourceSize.y === 0 ? 1 : targetSize.y / sourceSize.y,
    );

    if (this.selectedObjectsInternal.size === 1) {
      const obj = [...this.selectedObjectsInternal][0]!;
      const relPos = obj.pos.sub(sourceAABB.tl);
      const ogSize = obj.getAABB().size;
      obj.editorScale(scale);
      const newSize = obj.getAABB().size;
      const newScale = new Vector2(
        ogSize.x === 0 ? 1 : newSize.x / ogSize.x,
        ogSize.y === 0 ? 1 : newSize.y / ogSize.y,
      );
      obj.set("position", (obj.pos = targetAABB.tl.add(relPos.mult(newScale))));
      return;
    }

    for (const obj of this.selectedObjectsInternal) {
      const relPos = obj.pos.sub(sourceAABB.tl);
      obj.set("position", (obj.pos = targetAABB.tl.add(relPos.mult(scale))));
      obj.editorScale(scale);
    }
  }

  // ===== Rotation (for handles) =====
  public rotateSelectionCCW(): void {
    if (this.selectedObjectsInternal.size === 0) return;
    const aabb = this.getSelectedAABB();
    if (!aabb) return;
    if (this.selectedObjectsInternal.size === 1) {
      const obj = [...this.selectedObjectsInternal][0]!;
      obj.editorRotateShapeCCW();
      return;
    }
    const center = aabb.center;
    for (const obj of this.selectedObjectsInternal) {
      const rel = obj.pos.sub(center);
      const relRot = new Vector2(rel.y, -rel.x); // CCW 90
      obj.editorRotateCCW();
      obj.set("position", (obj.pos = center.add(relRot)));
    }
  }

  public rotateSelectionCW(): void {
    if (this.selectedObjectsInternal.size === 0) return;
    const aabb = this.getSelectedAABB();
    if (!aabb) return;
    if (this.selectedObjectsInternal.size === 1) {
      const obj = [...this.selectedObjectsInternal][0]!;
      obj.editorRotateShapeCW();
      return;
    }
    const center = aabb.center;
    for (const obj of this.selectedObjectsInternal) {
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

        if (this.selectedObjectsInternal.size <= 1) return;
        ctx.strokeStyle = "#FFFFFF";
        ctx.lineWidth = 1;
        for (const obj of this.selectedObjectsInternal) {
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
      !this.selectedObjectsInternal.has(this.highlightedObject)
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
    if (this.overrideMode) {
      this.currentMode.pointerdown(info);
      return;
    }

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
            for (const obj of this.selectedObjectsInternal) {
              obj.delete(true);
            }
            this.clearSelection();
            this.highlightedObject = null;
            return;
          case "copy": {
            const duplicates: LevelObject[] = [];
            for (const obj of this.selectedObjectsInternal) {
              const dup = obj.duplicate();
              this.scene.addObjectToLevel(dup);
              duplicates.push(dup);
            }
            this.clearSelection();
            for (const d of duplicates) {
              this.selectedObjectsInternal.add(d);
              this.scene.moveObjectToTop(d);
            }
            this.syncSelectedObjects();
            this.highlightedObject = null;
            this.startPointer = pointerPos;
            this.setMode("move");
            this.currentMode.pointerdown(info);
            return;
          }
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

    if (this.selectedTool === "place") {
      this.currentMode = this.placeMode;
      this.startPointer = pointerPos;
      this.selectionPointer = pointerPos;
      this.currentMode.pointerdown(info);
      return;
    }

    if (this.selectedTool === "pan") {
      this.currentMode = this.panMode;
      this.startPointer = pointerPos;
      this.currentMode.pointerdown(info);
      return;
    }

    // Check for object selection
    const obj = this.scene.getObjectAtPointer(info);
    if (obj instanceof LevelObject) {
      if (info.shift) {
        if (this.selectedObjectsInternal.has(obj)) {
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
