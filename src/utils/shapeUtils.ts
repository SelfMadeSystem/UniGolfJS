import { simplify, FillRule } from "ishape_wasm";
import { Vector2 } from "./vec";

/**
 * Creates a union shape from a list of polygons.
 */
export function unionPolygons(polygons: Vector2[][]): Vector2[][][] {
  const simplified: [number, number][][][] = simplify(
    polygons.map((p) => p.map((p) => p.a)),
    FillRule.NonZero,
  );
  return simplified.map((shape) =>
    shape.map((polygon) => polygon.map(([x, y]) => new Vector2(x, y))),
  );
}
