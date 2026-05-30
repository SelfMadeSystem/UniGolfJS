import z from "zod";
import { LAYERS } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import { rgbSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import type { Vector2 } from "@/utils/vec";
import { unionPolygons } from "@/utils/shapeUtils";

export const FloorSchema = PolyObjectSchema.extend({
  floorColor: rgbSchema.default("#79b87b"),
});

export class Floor extends PolyObject<typeof FloorSchema> {
  static override schema = FloorSchema;
  static points: Map<Floor, Vector2[]> = new Map();
  static cachedPath: Path2D | null = null;

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof FloorSchema>) {
    super(options);
    this.onAny(() => {
      this.setPoints();
    });
    this.setPoints();
  }

  setPoints() {
    Floor.points.set(this, this.getPoints());
    Floor.cachedPath = null;
  }

  override getPathInfo(): PathInfo {
    return {
      fillLayer: LAYERS.FLOOR,
      fillColor: this.data.floorColor,
    };
  }

  override delete(fromLevel?: boolean): void {
    super.delete(fromLevel);
    Floor.points.delete(this);
    Floor.cachedPath = null;
  }

  static override *staticRender(info: RenderInfo): Iterable<RenderPass> {
    if (!Floor.cachedPath) {
      const allPoints = Array.from(Floor.points.values());
      const union = unionPolygons(allPoints);
      const path = new Path2D();
      for (const p of union) {
        for (const polygon of p) {
          path.moveTo(polygon[0]!.x, polygon[0]!.y);
          for (let i = 1; i < polygon.length; i++) {
            path.lineTo(polygon[i]!.x, polygon[i]!.y);
          }
          path.closePath();
        }
      }
      Floor.cachedPath = path;
    }

    yield pass(LAYERS.FLOOR, (ctx) => {
      ctx.fillStyle = "#79b87b";
      ctx.fill(Floor.cachedPath!);
    });
  }
}
registerLevelObject("floor", Floor);
