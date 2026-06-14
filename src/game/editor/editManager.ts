import { LAYERS } from '../levelConfig';
import { LevelObject } from '../objects/levelObject';
import { HandlesManager } from './handles';
import { HistoryManager } from './history';
import { KeybindsManager } from './keybindsManager';
import { DummyMode } from './modes/dummyMode';
import type { InteractionMode } from './modes/interactionMode';
import { MoveMode } from './modes/moveMode';
import { PanMode } from './modes/panMode';
import { PlaceMode } from './modes/placeMode';
import { ResizeMode } from './modes/resizeMode';
import { SelectMode } from './modes/selectMode';
import { syncSelectedObjects } from './state';
import {
  type Drawable,
  type RenderInfo,
  type RenderPass,
  pass,
} from '@/render/drawable';
import type { PointerEventHandler, PointerInfo } from '@/render/pointerEvents';
import type { EditScene } from '@/scenes/editScene';
import { AABB } from '@/utils/aabb';
import { Vector2 } from '@/utils/vec';

export type Tool = 'select' | 'place' | 'pan';

export class EditManager implements Drawable, PointerEventHandler {
  private selectedObjectsInternal: Set<LevelObject> = new Set();
  public highlightedObject: LevelObject | null = null;
  /** world coordinates */
  public startPointer: Vector2 | null = null;
  public selectionPointer: Vector2 | null = null;
  public readonly handles: HandlesManager;
  public readonly history: HistoryManager = new HistoryManager();

  public selectedTool: Tool = 'select';

  public overrideMode = false;
  public readonly selectMode: SelectMode = new SelectMode(this);
  public readonly moveMode: MoveMode = new MoveMode(this);
  public readonly resizeMode: ResizeMode = new ResizeMode(this);
  public readonly placeMode: PlaceMode = new PlaceMode(this);
  public readonly panMode: PanMode = new PanMode(this);
  public readonly dummyMode: DummyMode = new DummyMode(this);
  private _currentMode: InteractionMode = this.selectMode;
  public get currentMode() {
    return this._currentMode;
  }
  public set currentMode(mode: InteractionMode) {
    this._currentMode.onExit?.();
    this._currentMode = mode;
    this._currentMode.onEnter?.();
  }
  private keybinds = new KeybindsManager();

  constructor(public scene: EditScene) {
    syncSelectedObjects(this.selectedObjectsInternal);
    this.handles = new HandlesManager(this.scene);

    // delete objects
    this.keybinds.register({ key: 'Backspace' }, () => {
      this.deleteSelectedObjects();
    });
    this.keybinds.register({ key: 'Delete' }, () => {
      this.deleteSelectedObjects();
    });
    // duplicate objects
    this.keybinds.register({ key: 'd', ctrl: true }, () => {
      this.duplicateSelectedObjects();
    });
    this.keybinds.register({ key: 'd', meta: true }, () => {
      this.duplicateSelectedObjects();
    });
    // history
    this.keybinds.register({ key: 'z', shift: false, ctrl: true }, () => {
      this.history.undo();
    });
    this.keybinds.register({ key: 'z', shift: true, ctrl: true }, () => {
      this.history.redo();
    });
  }

  public get selectedObjects(): Set<LevelObject> {
    return new Set(this.selectedObjectsInternal);
  }

  public set selectedObjects(set: Set<LevelObject>) {
    this.selectedObjectsInternal = set;
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
    this.highlightedObject = null;
  }

  // ===== Mode Management =====
  public setMode(mode: 'select' | 'move' | 'resize' | 'place' | 'pan'): void {
    this.currentMode = {
      select: this.selectMode,
      move: this.moveMode,
      resize: this.resizeMode,
      place: this.placeMode,
      pan: this.panMode,
    }[mode];
  }

  public handleKeyDown(event: KeyboardEvent): boolean {
    return this.keybinds.handle(event);
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
      obj.set('position', (obj.pos = targetAABB.tl.add(relPos.mult(newScale))));
      return;
    }

    for (const obj of this.selectedObjectsInternal) {
      const relPos = obj.pos.sub(sourceAABB.tl);
      obj.set('position', (obj.pos = targetAABB.tl.add(relPos.mult(scale))));
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
      obj.set('position', (obj.pos = center.add(relRot)));
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
      obj.set('position', (obj.pos = center.add(relRot)));
    }
  }

  // delegated to EditorHandles

  *render(info: RenderInfo): Iterable<RenderPass> {
    const aabb = this.getSelectedAABB();
    if (aabb) {
      yield pass(LAYERS.EDITOR, ctx => {
        ctx.save();
        ctx.strokeStyle = '#FFFFFF';
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
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        for (const obj of this.selectedObjectsInternal) {
          const path = obj.getPath();
          ctx.stroke(path);
        }
      });
      // draw handles via the handles helper
      yield* this.handles.render(aabb, info);
    }

    if (this.currentMode.render) {
      yield* this.currentMode.render(info);
    }

    if (
      this.highlightedObject &&
      !this.selectedObjectsInternal.has(this.highlightedObject)
    ) {
      const path = this.highlightedObject.getPath();
      yield pass(LAYERS.EDITOR, ctx => {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.fill(path);
      });
    }
  }

  public updateHighlight(info: PointerInfo) {
    const pointerPos = this.scene.screenToWorld(info.pos);
    const selectedAABB = this.getSelectedAABB();
    if (selectedAABB) {
      const hit = this.handles.hitTest(pointerPos, selectedAABB);
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
    this.startPointer = null;
    this.selectionPointer = null;
  }

  pointerdown(info: PointerInfo): void {
    if (this.overrideMode) {
      this.currentMode.pointerdown(info);
      return;
    }

    const pointerPos = this.scene.screenToWorld(info.pos);

    this.startPointer = pointerPos;
    this.selectionPointer = pointerPos;
    this.highlightedObject = null;

    // Check for handle hits first
    const selectedAABB = this.getSelectedAABB();
    if (selectedAABB) {
      const hit = this.handles.hitTest(pointerPos, selectedAABB);
      if (hit) {
        this.currentMode = this.dummyMode;
        hit.execute(this, info);
        return;
      }
    }

    switch (this.selectedTool) {
      case 'select':
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

          this.currentMode = this.moveMode;
        } else {
          // Empty space - start selection drag
          this.currentMode = this.selectMode;
        }

        this.currentMode.pointerdown(info);
        break;
      case 'place':
        this.currentMode = this.placeMode;
        this.currentMode.pointerdown(info);
        break;
      case 'pan':
        this.currentMode = this.panMode;
        this.currentMode.pointerdown(info);
        break;
    }
  }

  public duplicateSelectedObjects() {
    const originals: LevelObject[] = [...this.selectedObjectsInternal];
    const duplicates: LevelObject[] = [];

    // create duplicates and keep mapping of oldId -> newObj
    for (const obj of originals) {
      const dup = obj.duplicate();
      this.scene.addObjectToLevel(dup);
      duplicates.push(dup);
    }

    const idMap = new Map<string, string>();
    for (let i = 0; i < originals.length; i++) {
      idMap.set(originals[i]!.id, duplicates[i]!.id);
    }

    // helper to recursively replace any id references in data
    function replaceIdsInPlace(value: any) {
      if (value === null || value === undefined) return value;
      if (typeof value === 'string') {
        return idMap.get(value) ?? value;
      }
      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          value[i] = replaceIdsInPlace(value[i]);
        }
        return value;
      }
      if (typeof value === 'object') {
        for (const k of Object.keys(value)) {
          value[k] = replaceIdsInPlace(value[k]);
        }
        return value;
      }
      return value;
    }

    // patch duplicated objects' data to point internal refs to new ids
    for (const dup of duplicates) {
      const data = dup.getData();
      replaceIdsInPlace(data);
    }

    this.clearSelection();
    for (const d of duplicates) {
      this.selectedObjectsInternal.add(d);
      this.scene.moveObjectToTop(d);
    }
    this.syncSelectedObjects();
  }

  public deleteSelectedObjects() {
    const selected = this.selectedObjects;
    for (const obj of this.selectedObjectsInternal) {
      obj.delete(true);
    }
    this.clearSelection();
    this.history.push({
      name: 'Deleted',
      redo: () => {
        for (const s of selected) {
          s.delete(true);
        }
        this.clearSelection();
      },
      undo: () => {
        for (const s of selected) {
          this.scene.addObjectToLevel(s);
        }
      },
    });
  }
}
