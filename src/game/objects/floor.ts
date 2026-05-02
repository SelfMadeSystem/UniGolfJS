import z from "zod";
import { LAYERS } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import { rgbSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";

export const FloorSchema = PolyObjectSchema.extend({
  floorColor: rgbSchema.default("#79b87b"),
});

export class Floor extends PolyObject<typeof FloorSchema> {
  static override schema = FloorSchema;

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof FloorSchema>) {
    super(options);
  }

  override getPathInfo(): PathInfo {
    return {
      fillLayer: LAYERS.FLOOR,
      fillColor: this.data.floorColor,
    };
  }
}
registerLevelObject("floor", Floor);
