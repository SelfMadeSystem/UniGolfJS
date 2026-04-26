import {
  renderDrawables,
  type RenderInfo,
} from "@/render/drawable";
import { Scene } from "./scene";
import { BackMenu } from "@/ui/BackMenu";
import type { GameObject } from "@/game/objects/gameObject";
import type { LevelConfig } from "@/game/levelConfig";
import { Wall } from "@/game/objects/wall";

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
      new Wall({
        position: [100, 100],
        scale: [100, 100],
        ...level,
      }),
      new Wall({
        position: [200, 100],
        scale: [100, 100],
        shape: 'inverseQuarterCircle',
        ...level,
      }),
      new Wall({
        position: [300, 100],
        scale: [100, 100],
        shape: 'quarterCircle',
        ...level,
      }),
      new Wall({
        position: [400, 100],
        scale: [100, 100],
        shape: 'triangle',
        ...level,
      }),
    );
  }

  override get ui() {
    return BackMenu;
  }

  override render(info: RenderInfo, ctx: CanvasRenderingContext2D): void {
    renderDrawables(this.objects, info, ctx);
  }
}
