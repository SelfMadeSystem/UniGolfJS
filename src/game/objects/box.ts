import type z from "zod";
import { LevelObject, LevelObjectSchema } from "./levelObject";
import { WALL_CONFIG, type LevelConfig } from "../levelConfig";
import { type RenderInfo, type RenderPass } from "@/render/drawable";
import { Vector2 } from "@/utils/vec";

export const BoxSchema = LevelObjectSchema.extend({
  // Nothing yet...
});

export class Box extends LevelObject<typeof BoxSchema> {
  static override schema = BoxSchema;

  constructor(options: z.input<typeof BoxSchema>, levelConfig: LevelConfig) {
    super(options, levelConfig);
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    const points = [
      new Vector2(-0.5, -0.5),
      new Vector2(0.5, -0.5),
      new Vector2(0.5, 0.5),
      new Vector2(-0.5, 0.5),
    ].map((p) => p.mult(this.scale).add(this.pos));

    const { wallShadowColor, wallOutlineColor, wallColor } = this.levelConfig;
    const { shadow, outline, height } = WALL_CONFIG;

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
