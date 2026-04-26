import {
  pass,
  renderDrawables,
  type RenderInfo,
  type RenderPass,
} from "@/render/drawable";
import { Scene } from "./scene";
import { BackMenu } from "@/ui/BackMenu";
import type { GameObject } from "@/game/objects/gameObject";
import { LAYERS, type LevelConfig } from "@/game/levelConfig";
import { Wall } from "@/game/objects/wall";
import { Ball } from "@/game/objects/ball";
import { RigidBody } from "@/game/objects/rigidBody";
import type { PointerInfo } from "@/render/renderer";
import { LevelObject } from "@/game/objects/levelObject";
import { Vector2 } from "@/utils/vec";
import { Boost } from "@/game/objects/boost";
import { Tee } from "@/game/objects/tee";
import { Hole } from "@/game/objects/hole";
import { Water } from "@/game/objects/water";

export class PlayScene extends Scene {
  public objects: GameObject<any>[] = [];
  public cameraPos: Vector2 = new Vector2(-100, -100);
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

  constructor() {
    super();

    this.passes = [
      pass(LAYERS.WATER_WALL_PRE, (ctx) => {
        ctx.save();
        this.clipPath = new Path2D();
      }),
      // water will add to the clipPath in WATER_WALL_CLIP_REGIONS
      pass(LAYERS.WATER_WALL_CLIP, (ctx) => {
        ctx.clip(this.clipPath);
      }),
      // walls will render their "water walls" in WATER_WALL_FILL
      pass(LAYERS.WATER_WALL_POST, (ctx) => {
        ctx.restore();
      }),
    ];

    const level: LevelConfig = {
      wallColor: "#388164",
      wallOutlineColor: "#29694f",
      wallShadowColor: "#76b97e",
      waterWallColor: "#307860",
      floorColor: "#cce2dd",
      floorAccentColor: "#d9e6e2",
      teeColor: "#f79d60",
    };

    this.objects.push(
      new Wall({
        position: [100, 100],
        scale: [100, 100],
        shape: "circle",
        ...level,
      }),
      new Wall({
        position: [200, 100],
        scale: [100, 100],
        shape: "inverseQuarterCircle",
        ...level,
      }),
      new Wall({
        position: [200, 0],
        scale: [100, 100],
        shape: "inverseQuarterCircle",
        rotation: "90",
        ...level,
      }),
      new Wall({
        position: [100, 0],
        scale: [100, 100],
        shape: "inverseQuarterCircle",
        rotation: "180",
        ...level,
      }),
      new Wall({
        position: [300, 100],
        scale: [100, 100],
        shape: "quarterCircle",
        rotation: "180",
        ...level,
      }),
      new Wall({
        position: [400, 100],
        scale: [100, 100],
        shape: "triangle",
        ...level,
      }),
      new Ball({
        position: [100, 180],
        scale: [15, 15],
        velocity: [0, 0],
        ...level,
      }),
      new Ball({
        position: [200, 100],
        scale: [20, 20],
        velocity: [10, 0],
        ...level,
      }),
      new Ball({
        position: [220, 60],
        scale: [40, 40],
        mass: 2,
        velocity: [10, 0],
        ...level,
      }),
      new Boost({
        position: [100, 0],
        scale: [50, 50],
        shape: "circle",
        ...level,
      }),
      new Boost({
        position: [125, 0],
        scale: [50, 50],
        shape: "rectangle",
        ...level,
      }),
      new Tee({
        position: [100, 300],
        ...level,
      }),
      new Hole({
        position: [300, 300],
        ...level,
      }),
      new Water({
        position: [300, 175],
        scale: [100, 100],
        shape: "rectangle",
        ...level,
      }),
      new Water({
        position: [60, 40],
        scale: [100, 100],
        shape: "triangle",
        ...level,
      }),
    );
  }

  override get ui() {
    return BackMenu;
  }

  override tick(): void {
    RigidBody.beginFrame();
    for (const obj of this.objects) {
      obj.tick();
      obj.set("debug", false);
    }

    const obj = this.getObjectAtPointer(this.lastPointer);
    if (obj) {
      obj.set("debug", true);
    }

    this.tickPointers = [];
  }

  override render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-this.cameraPos.x, -this.cameraPos.y);
    ctx.scale(this.cameraZoom, this.cameraZoom);
    renderDrawables(this.objects, info, ctx, this.passes);
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

  resetAllObjects(): void {
    for (const obj of this.objects) {
      obj.reset();
    }
  }
}
