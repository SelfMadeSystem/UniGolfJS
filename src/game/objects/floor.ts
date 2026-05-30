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
  static points: Map<string, Map<Floor, Vector2[]>> = new Map();
  static floorToColor: Map<Floor, string> = new Map();
  static cachedPath: Map<string, Path2D> = new Map();
  static draggingFloors: Set<Floor> = new Set();

  static setPoints(color: string, floor: Floor, points: Vector2[]) {
    const prevColor = Floor.floorToColor.get(floor);
    if (prevColor && prevColor !== color) {
      const prevColorMap = Floor.points.get(prevColor);
      if (prevColorMap) {
        prevColorMap.delete(floor);
        Floor.cachedPath.delete(prevColor);
      }
    }
    Floor.floorToColor.set(floor, color);
    let colorMap = Floor.points.get(color);
    if (!colorMap) {
      colorMap = new Map();
      Floor.points.set(color, colorMap);
    }
    colorMap.set(floor, points);
    Floor.cachedPath.delete(color);
  }

  static removePoints(floor: Floor) {
    const color = Floor.floorToColor.get(floor);
    if (color) {
      const colorMap = Floor.points.get(color);
      if (colorMap) {
        colorMap.delete(floor);
        Floor.cachedPath.delete(color);
      }
      Floor.floorToColor.delete(floor);
    }
  }

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof FloorSchema>) {
    super(options);
    this.onAny(() => {
      if (this.dragging) return;
      this.setPoints();
    });
    this.setPoints();
  }

  override startDragging(): void {
    super.startDragging();
    Floor.removePoints(this);
    Floor.draggingFloors.add(this);
  }

  override stopDragging(): void {
    super.stopDragging();
    this.setPoints();
    Floor.draggingFloors.delete(this);
  }

  setPoints() {
    Floor.setPoints(this.data.floorColor, this, this.getPoints());
  }

  override getPathInfo(): PathInfo {
    return {
      fillLayer: LAYERS.FLOOR,
      fillColor: this.data.floorColor,
    };
  }

  *renderDragging(info: RenderInfo): Iterable<RenderPass> {
    const points = this.getPoints();
    if (points.length < 3) return;

    const path = new Path2D();
    path.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i]!.x, points[i]!.y);
    }
    path.closePath();

    yield pass(LAYERS.FLOOR, (ctx) => {
      ctx.fillStyle = this.data.floorColor;
      ctx.fill(path);
    });
  }

  override delete(fromLevel?: boolean): void {
    super.delete(fromLevel);
    Floor.removePoints(this);
  }

  static override *staticRender(info: RenderInfo): Iterable<RenderPass> {
    for (const floor of Floor.draggingFloors) {
      yield* floor.renderDragging(info);
    }

    for (const [color, colorMap] of Floor.points) {
      let path = Floor.cachedPath.get(color);
      if (!path) {
        const allPoints = Array.from(colorMap.values());
        const union = unionPolygons(allPoints);
        path = new Path2D();
        for (const p of union) {
          for (const polygon of p) {
            if (polygon.length < 3) continue;
            path.moveTo(polygon[0]!.x, polygon[0]!.y);
            for (let i = 1; i < polygon.length; i++) {
              path.lineTo(polygon[i]!.x, polygon[i]!.y);
            }
            path.closePath();
          }
        }
        Floor.cachedPath.set(color, path);
      }
      yield pass(LAYERS.FLOOR, (ctx) => {
        ctx.fillStyle = color;
        ctx.fill(path);
      });
    }
  }
}
registerLevelObject("floor", Floor);
