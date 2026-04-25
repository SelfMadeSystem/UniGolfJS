import z from "zod";
import { LevelObject, LevelObjectSchema } from "./levelObject";
import { WALL_CONFIG, type LevelConfig } from "../levelConfig";
import { type RenderInfo, type RenderPass } from "@/render/drawable";
import { Vector2 } from "@/utils/vec";

export const TriangleSchema = LevelObjectSchema.extend({
  rotation: z.enum(["0", "90", "180", "270"]).default("0"),
});

export class Triangle extends LevelObject<typeof TriangleSchema> {
  static override schema = TriangleSchema;

  constructor(
    options: z.input<typeof TriangleSchema>,
    levelConfig: LevelConfig,
  ) {
    super(options, levelConfig);
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    const { pos, scale } = this;
    const { outline, height, shadow } = WALL_CONFIG;

    const rotation = parseInt(this.get("rotation"), 10) as 0 | 90 | 180 | 270;

    const points = [
      new Vector2(-0.5, -0.5),
      new Vector2(0.5, 0.5),
      new Vector2(-0.5, 0.5),
    ].map((p) => p.rot90(rotation).mult(scale).add(pos));

    const { wallShadowColor, wallOutlineColor, wallColor } = this.levelConfig;

    return this.renderPoints({
      points,
      shadowColor: wallShadowColor,
      outlineColor: wallOutlineColor,
      fillColor: wallColor,
      height,
      shadow,
      outline,
    });
  }

  override tick(): void {}
}
