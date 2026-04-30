import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import { rgbSchema } from "@/utils/data";

export const WallSchema = PolyObjectSchema.extend({
  wallColor: rgbSchema.default("#388164"),
  wallOutlineColor: rgbSchema.default("#29694f"),
  wallShadowColor: rgbSchema.default("#76b97e"),
  waterWallColor: rgbSchema.default("#779977"),
});

export class Wall extends PolyObject<typeof WallSchema> {
  static override schema = WallSchema;

  constructor(options: z.input<typeof WallSchema>) {
    super(options);
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
      outline: WALL_CONFIG.outline,
      waterWallHeight: WALL_CONFIG.waterWallHeight,
    };
  }
}
