import {
  pass,
  renderDrawables,
  type Drawable,
  type RenderInfo,
} from "@/render/drawable";
import { Scene } from "./scene";
import { BackMenu } from "@/ui/BackMenu";
import { Vector2 } from "@/utils/vec";
import type { GameObject } from "@/game/objects/gameObject";
import type { LevelConfig } from "@/game/levelConfig";
import { Box } from "@/game/objects/box";
import { Triangle } from "@/game/objects/triangle";

type PlayObject = Drawable & {
  aabb: [Vector2, Vector2];
  setHover(hover: boolean): void;
};

export class PlayScene extends Scene {
  private objects: GameObject<any>[] = [];

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
      new Box(
        {
          position: [100, 100],
          scale: [50, 50],
        },
        level,
      ),
      new Triangle(
        {
          position: [200, 100],
          scale: [25, 50],
          rotation: "0",
        },
        level,
      ),
      new Triangle(
        {
          position: [300, 100],
          scale: [25, 50],
          rotation: "90",
        },
        level,
      ),
      new Triangle(
        {
          position: [400, 100],
          scale: [25, 50],
          rotation: "180",
        },
        level,
      ),
      new Triangle(
        {
          position: [500, 100],
          scale: [25, 50],
          rotation: "270",
        },
        level,
      ),


      new Triangle(
        {
          position: [200, 200],
          scale: [50, 25],
          rotation: "0",
        },
        level,
      ),
      new Triangle(
        {
          position: [300, 200],
          scale: [50, 25],
          rotation: "90",
        },
        level,
      ),
      new Triangle(
        {
          position: [400, 200],
          scale: [50, 25],
          rotation: "180",
        },
        level,
      ),
      new Triangle(
        {
          position: [500, 200],
          scale: [50, 25],
          rotation: "270",
        },
        level,
      ),
      new Triangle(
        {
          position: [300, 150],
          scale: [400, 100],
          rotation: "0",
        },
        level,
      ),
    );
  }

  override get ui() {
    return BackMenu;
  }

  override render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {
    renderDrawables(this.objects, info, ctx);
  }
}
