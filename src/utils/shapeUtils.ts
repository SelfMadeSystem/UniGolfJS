import { Overlay, OverlayRule, FillRule } from "ishape_wasm";
import { Vector2 } from "./vec";

/**
 * Creates a union shape from a list of polygons.
 */
export function unionPolygons(polygons: Vector2[][]): Vector2[][][] {
  if (polygons.length === 0) return [];
  if (polygons.length === 1) return [polygons];

  let shape1 = [[polygons[0]!.map(p => p.a)]];

  for (let i = 1; i < polygons.length; i++) {
    const shape2 = polygons[i]!.map(p => p.a);
    const overlay = Overlay.new_with_subj_and_clip(shape1, shape2);
    if (!overlay) {
      console.error("Failed to create overlay for unionPolygons");
      continue;
    }
    const result = overlay.overlay(OverlayRule.Union, FillRule.NonZero);
    shape1 = result;
  }

  return shape1.map(r => r.map(x => x.map(p => new Vector2(p[0], p[1]))));
}
