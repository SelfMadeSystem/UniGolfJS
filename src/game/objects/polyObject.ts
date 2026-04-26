import z from "zod";
import { type LevelConfig } from "../levelConfig";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema, type PathInfo } from "./levelObject";
import type { RenderInfo, RenderPass } from "@/render/drawable";

export const PolyObjectSchema = LevelObjectSchema.extend({
  shape: z
    .enum(["rectangle", "triangle", "quarterCircle", "inverseQuarterCircle"])
    .default("rectangle"),
  rotation: z.enum(["0", "90", "180", "270"]).default("0"),
});

const baseQuarterCirclePoints = Array.from({ length: 16 }, (_, i) => {
  const angle = (i / 15) * (Math.PI / 2);
  return new Vector2(Math.cos(angle), Math.sin(angle)).sub([0.5, 0.5]);
});

const SHAPE_POINTS = {
  rectangle: [
    new Vector2(-0.5, -0.5),
    new Vector2(0.5, -0.5),
    new Vector2(0.5, 0.5),
    new Vector2(-0.5, 0.5),
  ],
  triangle: [
    new Vector2(-0.5, -0.5),
    new Vector2(0.5, 0.5),
    new Vector2(-0.5, 0.5),
  ],
  quarterCircle: [new Vector2(-0.5, -0.5), ...baseQuarterCirclePoints],
  inverseQuarterCircle: [new Vector2(0.5, 0.5), ...baseQuarterCirclePoints],
};

export abstract class PolyObject<
  SchemaType extends typeof PolyObjectSchema = typeof PolyObjectSchema,
> extends LevelObject<SchemaType> {
  static override schema = PolyObjectSchema;

  constructor(options: z.input<SchemaType>) {
    super(options);
  }

  getAABB(): { tl: Vector2; br: Vector2 } {
    return {
      tl: this.pos.sub(this.scale.mult(0.5)),
      br: this.pos.add(this.scale.mult(0.5)),
    };
  }

  getPoints(): Vector2[] {
    const { shape, rotation } = this.data;
    const basePoints = SHAPE_POINTS[shape];
    const rot = parseInt(rotation) as 0 | 90 | 180 | 270;
    return basePoints.map((p) => p.rot90(rot).mult(this.scale).add(this.pos));
  }

  abstract getPathInfo(): PathInfo;

  override render(info: RenderInfo): Iterable<RenderPass> {
    const points = this.getPoints();
    const pathInfo = this.getPathInfo();
    return this.renderPoints({ points, ...pathInfo });
  }
}
