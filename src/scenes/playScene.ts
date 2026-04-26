import { renderDrawables, type RenderInfo } from "@/render/drawable";
import { Scene } from "./scene";
import { BackMenu } from "@/ui/BackMenu";
import type { GameObject } from "@/game/objects/gameObject";
import type { LevelConfig } from "@/game/levelConfig";
import { Wall } from "@/game/objects/wall";
import { Ball } from "@/game/objects/ball";
import { RigidBody } from "@/game/objects/rigidBody";
import type { PointerInfo } from "@/render/renderer";
import { LevelObject } from "@/game/objects/levelObject";
import { Vector2 } from "@/utils/vec";
import { Boost } from "@/game/objects/boost";

export class PlayScene extends Scene {
  public objects: GameObject<any>[] = [];
  public cameraPos: Vector2 = new Vector2(-100, -100);
  public cameraZoom: number = 1;
  public lastPointer: PointerInfo | null = null;

  constructor() {
    super();

    const level: LevelConfig = {
      wallColor: "#388164",
      wallOutlineColor: "#29694f",
      wallShadowColor: "#76b97e",
      floorColor: "#cce2dd",
      floorAccentColor: "#d9e6e2",
      teeColor: "#ff0000",
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
        scale: [20, 20],
        velocity: [1, -1],
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
        position: [120, 0],
        scale: [50, 50],
        shape: "rectangle",
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
  }

  override render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(-this.cameraPos.x, -this.cameraPos.y);
    ctx.scale(this.cameraZoom, this.cameraZoom);
    renderDrawables(this.objects, info, ctx);
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

  getPointerPositionInWorld(pointer: PointerInfo): Vector2 {
    return pointer.pos.div(this.cameraZoom).add(this.cameraPos);
  }

  getObjectAtPointer(pointer: PointerInfo | null): GameObject<any> | null {
    if (!pointer) return null;
    const worldPos = this.getPointerPositionInWorld(pointer);
    for (const obj of this.objects) {
      if (obj instanceof LevelObject && obj.isPointInside(worldPos)) return obj;
    }
    return null;
  }
}
