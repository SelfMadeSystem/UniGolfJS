import {
  pass,
  renderDrawables,
  type Drawable,
  type RenderInfo,
  type RenderPass,
} from "@/render/drawable";
import { Scene } from "./scene";
import type { GameObject } from "@/game/objects/gameObject";
import { LAYERS, WALL_CONFIG, type Level } from "@/game/levelConfig";
import { $renderer } from "@/render/renderer";
import { LevelObject } from "@/game/objects/levelObject";
import { Vector2 } from "@/utils/vec";
import { AABB } from "@/utils/aabb";
import type { PointerInfo } from "@/render/pointerEvents";
import { GameObjectCollection } from "@/game/gameObjectCollection";

const WATER_FILL_COLOR = "#40A0FF"; // TODO: put this somewhere more sensible

export abstract class LevelScene extends Scene {
  public objects: GameObjectCollection = new GameObjectCollection();
  public drawables: Drawable[] = [];
  public cameraPos: Vector2 = new Vector2(0, 0);
  public cameraZoom: number = 1;
  private cameraTarget: Vector2 | null = null;
  private cameraLerpAmount: number = 0.15;
  public tickPointers: PointerInfo[] = [];
  public clipPath: Path2D = new Path2D();
  public readonly passes: RenderPass[];

  constructor(public level: Level) {
    super();

    const { objects } = level;

    this.passes = [
      pass(LAYERS.WATER_WALL_PRE, (ctx) => {
        ctx.save();
        this.clipPath = new Path2D();
      }),
      // water will add to the clipPath in WATER_WALL_CLIP_REGIONS
      pass(LAYERS.WATER_WALL_CLIP, (ctx) => {
        ctx.clip(this.clipPath);
      }),
      pass(LAYERS.WATER_FILL, (ctx) => {
        ctx.save();
        ctx.translate(0, WALL_CONFIG.waterWallHeight);
        ctx.fillStyle = WATER_FILL_COLOR;
        ctx.fill(this.clipPath);
        ctx.restore();
      }),
      // walls will render their "water walls" in WATER_WALL_FILL
      pass(LAYERS.WATER_WALL_POST, (ctx) => {
        ctx.restore();
      }),
    ];

    this.objects = new GameObjectCollection(objects);
    this.resetAllObjects(true);
  }

  public getVisibleAABB(): AABB {
    const renderer = $renderer.get();
    if (!renderer) {
      throw new Error("Renderer not initialized");
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

  override render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {
    this.updateCameraMovement(info.delta);

    ctx.save();
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-this.cameraPos.x, -this.cameraPos.y);
    // TODO: only render objects that are within the camera's view
    renderDrawables(
      [...this.objects, ...this.drawables],
      info,
      ctx,
      this.passes,
    );
    ctx.restore();
  }

  override pointermove(info: PointerInfo): void {
    this.tickPointers.push(info);
  }

  override pointerup(info: PointerInfo): void {
    this.tickPointers.push(info);
  }

  override pointerdown(info: PointerInfo): void {
    this.tickPointers.push(info);
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
    if (!this.cameraTarget) return;

    const distanceSq = this.cameraPos.distSq(this.cameraTarget);

    if (distanceSq < 0.0001) {
      this.cameraPos = this.cameraTarget;
      this.cameraTarget = null;
      return;
    }

    const baseFrameMs = 1000 / 60;
    const progress =
      1 - Math.pow(1 - this.cameraLerpAmount, delta / baseFrameMs);
    this.cameraPos = this.cameraPos.lerp(this.cameraTarget, progress);
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

  getObjectAtPointer(pointer: PointerInfo | null): GameObject<any> | null {
    if (!pointer) return null;
    const worldPos = this.screenToWorld(pointer.pos);
    for (const obj of this.objects.toReversed()) {
      if (obj instanceof LevelObject && obj.isPointInside(worldPos)) return obj;
    }
    return null;
  }

  removeObject(obj: GameObject<any>): void {
    this.objects.remove(obj);
  }

  removeObjectFromLevel(obj: GameObject<any>): void {
    this.removeObject(obj);
    const levelIndex = this.level.objects.indexOf(obj);
    if (levelIndex !== -1) {
      this.level.objects.splice(levelIndex, 1);
    }
  }

  addObject(obj: GameObject<any>): void {
    this.objects.add(obj);
  }

  addObjectToLevel(obj: GameObject<any>): void {
    this.addObject(obj);
    this.level.objects.push(obj);
  }

  moveObjectToTop(obj: GameObject<any>): void {
    this.removeObject(obj);
    this.addObject(obj);
  }

  moveObjectToBottom(obj: GameObject<any>): void {
    this.removeObject(obj);
    this.objects.prepend(obj);
  }

  resetAllObjects(scene = false): void {
    for (const obj of this.objects) {
      obj.reset(scene);
    }
  }
}
