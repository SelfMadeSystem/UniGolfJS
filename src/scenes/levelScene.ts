import { Scene } from './scene';
import { getLevelConfig } from './state';
import { LAYERS, type Level } from '@/game/levelConfig';
import { LevelObjectCollection } from '@/game/levelObjectCollection';
import { LevelObject } from '@/game/objects/levelObject';
import type { Tee } from '@/game/objects/tee';
import { Water } from '@/game/objects/water';
import {
  type CanvasRenderInfo,
  type Drawable,
  type RenderPass,
  pass,
  renderDrawables,
} from '@/render/drawable';
import type { PointerInfo } from '@/render/pointerEvents';
import { $renderer } from '@/render/renderer';
import { AABB } from '@/utils/aabb';
import { Vector2 } from '@/utils/vec';

export abstract class LevelScene extends Scene {
  public objects: LevelObjectCollection = new LevelObjectCollection();
  public drawables: Drawable[] = [];
  public cameraPos: Vector2 = new Vector2(0, 0);
  public cameraZoom: number = 1;
  private cameraTarget: Vector2 | null = null;
  private cameraZoomTarget: number | null = null;
  private cameraLerpAmount: number = 0.15;
  private cameraZoomLerpAmount: number = 0.15;
  public tickPointers: PointerInfo<PointerEvent>[] = [];
  public shadowPath: Path2D = new Path2D();
  public activeTee: Tee | null = null;
  public passes: RenderPass[] = [];

  constructor(public level: Level) {
    super();

    const { objects } = level;

    this.objects = new LevelObjectCollection(objects);
    this.resetAllObjects(true);
    // make sure water's rendering logic is always active, even if there are no water objects in the level
    this.objects.addType(Water);

    this.passes.push(
      pass(LAYERS.WALL_SHADOW_DRAW, ctx => {
        const { shadowColor, shadowWidth } = getLevelConfig();
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = shadowWidth;
        ctx.lineJoin = 'round';
        ctx.stroke(this.shadowPath);
      }),
    );
  }

  public getVisibleAABB(): AABB {
    const renderer = $renderer.get();
    if (!renderer) {
      throw new Error('Renderer not initialized');
    }
    const canvas = renderer.canvas;
    const topLeft = this.screenToWorld(
      new Vector2(-canvas.clientWidth / 2, -canvas.clientHeight / 2),
    );
    const bottomRight = this.screenToWorld(
      new Vector2(canvas.clientWidth / 2, canvas.clientHeight / 2),
    );
    return new AABB(topLeft, bottomRight);
  }

  override tick(): void {
    this.tickPointers.length = 0;
  }

  override render(info: CanvasRenderInfo, ctx: CanvasRenderingContext2D): void {
    this.updateCameraMovement(info.delta);

    const visibleArea = this.getVisibleAABB();

    this.shadowPath = new Path2D();

    ctx.save();
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-this.cameraPos.x, -this.cameraPos.y);
    renderDrawables(
      [
        ...this.objects.drawableObjects(visibleArea),
        ...this.objects.drawableStatic(),
        ...this.drawables,
      ],
      {
        ...info,
        visibleArea,
      },
      ctx,
      this.passes,
    );
    ctx.restore();
  }

  override pointermove(info: PointerInfo<PointerEvent>): void {
    this.tickPointers.push(info);
    this.activeTee?.onPointerMove(info);
  }

  override pointerup(info: PointerInfo<PointerEvent>): void {
    this.tickPointers.push(info);
    this.activeTee?.onPointerUp();
  }

  override pointerdown(info: PointerInfo<PointerEvent>): void {
    this.tickPointers.push(info);
    this.activeTee?.onPointerDown();
  }

  /**
   * Converts a pointer position (relative to the center of the canvas) to a world position, taking into account camera position and zoom
   */
  screenToWorld(pos: Vector2): Vector2 {
    return pos.div(this.cameraZoom).add(this.cameraPos);
  }

  worldToScreen(pos: Vector2): Vector2 {
    return pos.sub(this.cameraPos).mult(this.cameraZoom);
  }

  private updateCameraMovement(delta: number): void {
    if (!this.cameraTarget && !this.cameraZoomTarget) return;

    // Update position
    if (this.cameraTarget) {
      const distanceSq = this.cameraPos.distSq(this.cameraTarget);

      if (distanceSq < 0.0001) {
        this.cameraPos = this.cameraTarget;
        this.cameraTarget = null;
      } else {
        const baseFrameMs = 1000 / 60;
        const progress =
          1 - Math.pow(1 - this.cameraLerpAmount, delta / baseFrameMs);
        this.cameraPos = this.cameraPos.lerp(this.cameraTarget, progress);
      }
    }

    // Update zoom
    if (this.cameraZoomTarget !== null) {
      const difference = Math.abs(this.cameraZoom - this.cameraZoomTarget);

      if (difference < 0.0001) {
        this.cameraZoom = this.cameraZoomTarget;
        this.cameraZoomTarget = null;
      } else {
        const baseFrameMs = 1000 / 60;
        const progress =
          1 - Math.pow(1 - this.cameraZoomLerpAmount, delta / baseFrameMs);
        this.cameraZoom =
          this.cameraZoom +
          (this.cameraZoomTarget - this.cameraZoom) * progress;
      }
    }
  }

  /**
   * Smoothly moves the camera toward a world position.
   */
  moveCameraTo(pos: Vector2, lerpAmount: number = 0.15): void {
    this.cameraTarget = pos.clone();
    this.cameraLerpAmount = lerpAmount;
  }

  /**
   * Immediately places the camera at a world position and cancels any smooth movement.
   */
  snapCameraTo(pos: Vector2): void {
    this.cameraPos = pos.clone();
    this.cameraTarget = null;
  }

  /**
   * Smoothly changes the camera zoom toward a target zoom level.
   */
  zoomCameraTo(zoom: number, lerpAmount: number = 0.15): void {
    this.cameraZoomTarget = zoom;
    this.cameraZoomLerpAmount = lerpAmount;
  }

  /**
   * Immediately sets the camera zoom and cancels any smooth zoom movement.
   */
  snapCameraZoomTo(zoom: number): void {
    this.cameraZoom = zoom;
    this.cameraZoomTarget = null;
  }

  /**
   * Gets the necessary zoom level to contain two points with a certain amount of padding
   */
  getNecessaryZoom(a: Vector2, b: Vector2, padding: number = 0) {
    const aabb = new AABB(a, b);
    try {
      const renderer = $renderer.get();
      if (!renderer) return 1;
      const canvas = renderer.canvas;
      const zoomX = (canvas.clientWidth - padding) / aabb.width;
      const zoomY = (canvas.clientHeight - padding) / aabb.height;
      return Math.min(zoomX, zoomY);
    } catch (e) {
      return 1;
    }
  }

  getObjectAtPointer(pointer: PointerInfo | null): LevelObject<any> | null {
    if (!pointer) return null;
    const worldPos = this.screenToWorld(pointer.pos);
    for (const obj of this.objects.toReversed()) {
      if (obj.isPointInside(worldPos)) return obj;
    }
    return null;
  }

  getObjectsAtPoint(point: Vector2): LevelObject<any>[] {
    const objects: LevelObject<any>[] = [];

    for (const obj of this.objects.queryByBBox(point)) {
      if (obj.isPointInside(point)) {
        objects.push(obj);
      }
    }

    return objects;
  }

  removeObject(obj: LevelObject<any>): void {
    this.objects.remove(obj);
  }

  removeObjectFromLevel(obj: LevelObject<any>): void {
    this.removeObject(obj);
    const levelIndex = this.level.objects.indexOf(obj);
    if (levelIndex !== -1) {
      this.level.objects.splice(levelIndex, 1);
    }
  }

  addObject(obj: LevelObject<any>): void {
    this.objects.add(obj);
  }

  addObjectToLevel(obj: LevelObject<any>): void {
    this.addObject(obj);
    this.level.objects.push(obj);
  }

  moveObjectToTop(obj: LevelObject<any>): void {
    this.removeObject(obj);
    this.addObject(obj);
  }

  moveObjectToBottom(obj: LevelObject<any>): void {
    this.removeObject(obj);
    this.objects.prepend(obj);
  }

  resetAllObjects(sceneReset = false): void {
    for (const obj of this.objects) {
      obj.reset(sceneReset, this);
    }
  }
}
