import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema, type CollisionInfo } from "./polyObject";
import type { PathInfo } from "./levelObject";
import type { Vector2 } from "@/utils/vec";
import type { RigidBody } from "./rigidBody";
import type { RenderInfo, RenderPass } from "@/render/drawable";
import { rgbSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";

export const WallSchema = PolyObjectSchema.extend({
  wallColor: rgbSchema.default("#388164"),
  wallOutlineColor: rgbSchema.default("#29694f"),
  wallShadowColor: rgbSchema.default("#76b97e"),
  waterWallColor: rgbSchema.default("#779977"),
});

export class BreakableWall extends PolyObject<typeof WallSchema> {
  static override schema = WallSchema;

  public broken = false;

  constructor(options: z.input<typeof WallSchema>) {
    super(options);
  }

  override get isSolid() {
    return !this.broken;
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: LAYERS.WALL_SHADOW,
      heightLayer: LAYERS.WALL_HEIGHT,
      outlineLayer: LAYERS.WALL_OUTLINE,
      fillLayer: LAYERS.WALL_FILL,
      shadowColor: this.data.wallShadowColor,
      outlineColor: this.data.wallOutlineColor,
      fillColor: this.data.wallColor,
      waterWallColor: this.data.waterWallColor,
      height: WALL_CONFIG.height,
      shadow: WALL_CONFIG.shadow,
      outline: -WALL_CONFIG.outline,
      waterWallHeight: WALL_CONFIG.waterWallHeight,
    };
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    if (this.broken) {
      return [];
    }
    return super.render(info);
  }

  override onCollision(
    rigidBody: RigidBody,
    collisionInfo: CollisionInfo,
  ): { velocity: Vector2 } {
    this.broken = true;
    return super.onCollision(rigidBody, collisionInfo);
  }

  override reset(): void {
    super.reset();
    this.broken = false;
  }
}
registerLevelObject("breakableWall", BreakableWall);
