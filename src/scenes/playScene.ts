import { renderDrawables, type RenderInfo } from "@/render/drawable";
import { Scene } from "./scene";
import { BackMenu } from "@/ui/BackMenu";
import type { GameObject } from "@/game/objects/gameObject";
import type { LevelConfig } from "@/game/levelConfig";
import { Wall } from "@/game/objects/wall";
import { Ball } from "@/game/objects/ball";
import { RigidBody } from "@/game/objects/rigidBody";

export class PlayScene extends Scene {
  public objects: GameObject<any>[] = [];

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
    );
  }

  override get ui() {
    return BackMenu;
  }

  override tick(): void {
    RigidBody.beginFrame();
    for (const obj of this.objects) {
      obj.tick();
    }
  }

  override render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(100, 100);
    renderDrawables(this.objects, info, ctx);
    ctx.restore();
  }
}
