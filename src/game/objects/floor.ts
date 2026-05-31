import z from "zod";
import { LAYERS } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import { rgbSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { unionPolygons } from "@/utils/shapeUtils";
import { Cluster, MyRBush } from "@/utils/spatialUtils";

export const FloorSchema = PolyObjectSchema.extend({
  floorColor: rgbSchema.default("#79b87b"),
});

export class Floor extends PolyObject<typeof FloorSchema> {
  static override schema = FloorSchema;
  static rbushes: Map<string, MyRBush<Floor>> = new Map();
  static clusterPathCache: Map<string, Map<Cluster<Floor>, Path2D>> = new Map();
  static floorToColor: Map<Floor, string> = new Map();
  static draggingFloors: Set<Floor> = new Set();

  static addFloor(floor: Floor) {
    const color = floor.data.floorColor;
    const rbush = this.rbushes.getOrInsertComputed(color, () => new MyRBush());
    rbush.insert(floor);
    this.floorToColor.set(floor, color);

    const cluster = rbush.itemToCluster.get(floor);
    if (cluster) {
      const clusterCache = this.clusterPathCache.get(color);
      clusterCache?.delete(cluster);
    }
  }

  static removeFloor(floor: Floor) {
    const color = this.floorToColor.get(floor);
    if (!color) return;
    this.floorToColor.delete(floor);
    const rbush = this.rbushes.get(color);
    if (!rbush) return;
    rbush.remove(floor);

    const cluster = rbush.itemToCluster.get(floor);
    if (cluster) {
      const clusterCache = this.clusterPathCache.get(color);
      clusterCache?.delete(cluster);
    }
  }

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof FloorSchema>) {
    super(options);
    this.onAny((key) => {
      if (this.dragging) return;
      Floor.removeFloor(this);
      Floor.addFloor(this);
    });
    Floor.addFloor(this);
  }

  override startDragging(): void {
    super.startDragging();
    Floor.removeFloor(this);
    Floor.draggingFloors.add(this);
  }

  override stopDragging(): void {
    super.stopDragging();
    Floor.addFloor(this);
    Floor.draggingFloors.delete(this);
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
    Floor.removeFloor(this);
  }

  static override *staticRender(info: RenderInfo): Iterable<RenderPass> {
    for (const floor of Floor.draggingFloors) {
      yield* floor.renderDragging(info);
    }

    for (const [color, rbush] of this.rbushes) {
      const clusterCache = this.clusterPathCache.getOrInsertComputed(color, () => new Map());

      const clusters = rbush.clusters;

      // Remove any clusters that no longer exist
      for (const cachedCluster of clusterCache.keys()) {
        if (!clusters.has(cachedCluster)) {
          clusterCache.delete(cachedCluster);
        }
      }

      for (const cluster of clusters) {
        let path = clusterCache.get(cluster);
        if (!path) {
          const polygons = Array.from(cluster.items, (floor) => floor.getPoints());
          const union = unionPolygons(polygons);
          path = new Path2D();
          for (const polygon of union) {
            for (const points of polygon) {
              if (points.length < 3) continue;
              path.moveTo(points[0]!.x, points[0]!.y);
              for (let i = 1; i < points.length; i++) {
                path.lineTo(points[i]!.x, points[i]!.y);
              }
              path.closePath();
            }
          }
          clusterCache.set(cluster, path);
        }
      }

      yield pass(LAYERS.FLOOR, (ctx) => {
        ctx.fillStyle = color;
        for (const cluster of rbush.searchCluster(info.visibleArea)) {
          const path = clusterCache.get(cluster);
          if (path) {
            ctx.fill(path);
          }
        }
      });
    }
  }
}
registerLevelObject("floor", Floor);
