import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";

export const WallSchema = PolyObjectSchema.extend({});

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
      height: WALL_CONFIG.height,
      shadow: WALL_CONFIG.shadow,
      outline: WALL_CONFIG.outline,
    };
  }
}
