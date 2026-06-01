import { unionPolygons } from "@/utils/shapeUtils";
import { ClusteredRBush, type Cluster } from "@/utils/spatialUtils";
import type { PolyObject } from "@/game/objects/polyObject";
import type { AABB } from "@/utils/aabb";
import type { Vector2 } from "@/utils/vec";

export class BatchObjectRenderer<T extends PolyObject<any>> {
  public rbushes: Map<string, ClusteredRBush<T>> = new Map();
  public clusterPathCache: Map<string, Map<Cluster<T>, [Path2D, Vector2[][]]>> =
    new Map();
  public objToColor: Map<T, string> = new Map();

  constructor(public colorFunc: (obj: T) => string = () => "\0") {}

  public addObject(obj: T) {
    const color = this.colorFunc(obj);
    const rbush = this.rbushes.getOrInsertComputed(
      color,
      () => new ClusteredRBush(),
    );
    rbush.insert(obj);
    this.objToColor.set(obj, color);

    const cluster = rbush.itemToCluster.get(obj);
    if (cluster) {
      const clusterCache = this.clusterPathCache.get(color);
      clusterCache?.delete(cluster);
    }
  }

  public removeObject(obj: T) {
    const color = this.objToColor.get(obj);
    if (!color) return;
    this.objToColor.delete(obj);
    const rbush = this.rbushes.get(color);
    if (!rbush) return;
    rbush.remove(obj);

    const cluster = rbush.itemToCluster.get(obj);
    if (cluster) {
      const clusterCache = this.clusterPathCache.get(color);
      clusterCache?.delete(cluster);
    }
  }

  public *getPaths(
    viewport: AABB,
  ): Iterable<[string, Iterable<[Path2D, Vector2[][]]>]> {
    for (const [color, rbush] of this.rbushes) {
      const clusterCache = this.clusterPathCache.getOrInsertComputed(
        color,
        () => new Map(),
      );

      const clusters = rbush.clusters;

      // Remove any clusters that no longer exist
      for (const cachedCluster of clusterCache.keys()) {
        if (!clusters.has(cachedCluster)) {
          clusterCache.delete(cachedCluster);
        }
      }

      yield [color, getPathsImpl<T>(rbush, viewport, clusterCache)];
    }
  }
}

function* getPathsImpl<T extends PolyObject<any>>(
  rbush: ClusteredRBush<T>,
  viewport: AABB,
  clusterCache: Map<Cluster<T>, [Path2D, Vector2[][]]>,
): Iterable<[Path2D, Vector2[][]]> {
  for (const cluster of rbush.searchCluster(viewport)) {
    let cache = clusterCache.get(cluster);
    if (cache) {
      yield cache;
    } else {
      const polygons = Array.from(cluster.items, (floor) => floor.getPoints());
      const union = unionPolygons(polygons);
      const path = new Path2D();
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
      clusterCache.set(cluster, [path, union.flat()]);
      yield [path, union.flat()];
    }
  }
}
