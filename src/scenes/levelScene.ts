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
import { $renderer, type PointerInfo } from "@/render/renderer";
import { LevelObject } from "@/game/objects/levelObject";
import { Vector2 } from "@/utils/vec";
import { AABB } from "@/utils/aabb";

const WATER_FILL_COLOR = "#40A0FF"; // TODO: put this somewhere more sensible

export abstract class LevelScene extends Scene {
  public objects: GameObject<any>[] = [];
  public drawables: Drawable[] = [];
  public cameraPos: Vector2 = new Vector2(0, 0);
  public cameraZoom: number = 1;
  private _lastPointer: PointerInfo | null = null;
  public tickPointers: PointerInfo[] = [];
  public clipPath: Path2D = new Path2D();
  public readonly passes: RenderPass[];

  get lastPointer(): PointerInfo | null {
    return this._lastPointer;
  }

  set lastPointer(info: PointerInfo | null) {
    this._lastPointer = info;
    if (info) {
      this.tickPointers.push(info);
    }
  }

  constructor(public level: Level) {
    super();

    const { config, objects } = level;

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
        ctx.fillStyle = config.waterWallColor;
        ctx.fill(this.clipPath);
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

    this.objects = objects;
  }

  public getVisibleAABB(): AABB {
    const renderer = $renderer.get();
    if (!renderer) {
      throw new Error("Renderer not initialized");
    }
    const canvas = renderer.canvas;
    const topLeft = this.getPointerPositionInWorld(
      new Vector2(-canvas.clientWidth / 2, -canvas.clientHeight / 2),
    );
    const bottomRight = this.getPointerPositionInWorld(
      new Vector2(canvas.clientWidth / 2, canvas.clientHeight / 2),
    );
    return new AABB(topLeft, bottomRight);
  }

  override tick(): void {
    this.tickPointers = [];
  }

  override render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.scale(this.cameraZoom, this.cameraZoom);
    ctx.translate(-this.cameraPos.x, -this.cameraPos.y);
    renderDrawables(
      [...this.objects, ...this.drawables],
      info,
      ctx,
      this.passes,
    );
    ctx.restore();
  }

  override pointermove(info: PointerInfo): void {
    this.lastPointer = info;
  }

  override pointerup(info: PointerInfo): void {
    this.lastPointer = info;
  }

  override pointerdown(info: PointerInfo): void {
    this.lastPointer = info;
  }

  /**
   * Converts a pointer position (relative to the center of the canvas) to a world position, taking into account camera position and zoom
   */
  getPointerPositionInWorld(pos: Vector2): Vector2 {
    return pos.div(this.cameraZoom).add(this.cameraPos);
  }

  getObjectAtPointer(pointer: PointerInfo | null): GameObject<any> | null {
    if (!pointer) return null;
    const worldPos = this.getPointerPositionInWorld(pointer.pos);
    for (const obj of this.objects.toReversed()) {
      if (obj instanceof LevelObject && obj.isPointInside(worldPos)) return obj;
    }
    return null;
  }

  removeObject(obj: GameObject<any>): void {
    const index = this.objects.indexOf(obj);
    if (index !== -1) {
      this.objects.splice(index, 1);
    }
  }

  addObject(obj: GameObject<any>): void {
    this.objects.push(obj);
  }

  moveObjectToTop(obj: GameObject<any>): void {
    this.removeObject(obj);
    this.addObject(obj);
  }

  moveObjectToBottom(obj: GameObject<any>): void {
    this.removeObject(obj);
    this.objects.unshift(obj);
  }

  resetAllObjects(): void {
    for (const obj of this.objects) {
      obj.reset();
    }
  }
}
