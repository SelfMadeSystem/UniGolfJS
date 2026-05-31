import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema, type CollisionInfo } from "./polyObject";
import type { PathInfo } from "./levelObject";
import { numberSchema, rgbSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";
import type { RigidBody } from "./rigidBody";
import type { Vector2 } from "@/utils/vec";
import type { RenderInfo } from "@/render/drawable";
import { blendColors } from "@/utils/colorUtils";

export const BouncyWallSchema = PolyObjectSchema.extend({
  bouncyWallColor: rgbSchema.default("#ff6b6b"),
  bouncyWallBoostColor: rgbSchema.default("#ff8787"),
  bouncyWallOutlineColor: rgbSchema.default("#cc5555"),
  wallShadowColor: rgbSchema.default("#76b97e"),
  waterWallColor: rgbSchema.default("#779977"),
  speed: numberSchema.default(60),
});

// TODO: share w/ boost
const BOOST_EFFECT_TIME = 10;

export class BouncyWall extends PolyObject<typeof BouncyWallSchema> {
  static override schema = BouncyWallSchema;
  public boostTime: number = 0;

  constructor(options: z.input<typeof BouncyWallSchema>) {
    super(options);
  }

  override tick(): void {
    super.tick();
    if (this.boostTime > 0) {
      this.boostTime--;
    }
  }

  override getPathInfo(info: RenderInfo): PathInfo {
    return {
      shadowLayer: LAYERS.WALL_SHADOW,
      heightLayer: LAYERS.WALL_HEIGHT,
      outlineLayer: LAYERS.WALL_OUTLINE,
      fillLayer: LAYERS.WALL_FILL,
      shadowColor: this.data.wallShadowColor,
      outlineColor: this.data.bouncyWallOutlineColor,
      fillColor: blendColors(
        this.data.bouncyWallColor,
        this.data.bouncyWallBoostColor,
        this.boostTime / BOOST_EFFECT_TIME,
      ),
      height: WALL_CONFIG.height,
      shadow: WALL_CONFIG.shadow,
      outline: WALL_CONFIG.outline,
      waterWallColor: this.data.waterWallColor,
      waterWallHeight: WALL_CONFIG.waterWallHeight - WALL_CONFIG.outline,
    };
  }

  override onCollision(
    rigidBody: RigidBody,
    collisionInfo: CollisionInfo,
  ): { velocity: Vector2 } {
    if (rigidBody.velocity.length() === 0)
      return { velocity: collisionInfo.newVelocity };

    this.boostTime = BOOST_EFFECT_TIME;
    const newVelocity = collisionInfo.newVelocity.setLength(this.data.speed);
    return { velocity: newVelocity };
  }
}
registerLevelObject("bouncyWall", BouncyWall);
