import { Vector2 } from './vec';
import { FillRule, Overlay, OverlayRule, simplify } from 'ishape_wasm';

/**
 * Creates a union shape from a list of polygons.
 */
export function unionPolygons(polygons: Vector2[][][]): Vector2[][][] {
  const simplified = simplify(
    polygons.map(p => p.map(p => p.map(p => p.a))),
    FillRule.NonZero,
  );
  if (!simplified) {
    throw new Error('Failed to simplify polygons');
  }
  return simplified.map(shape =>
    shape.map(polygon => polygon.map(([x, y]) => new Vector2(x, y))),
  );
}

/**
 * Excludes a shape from another shape.
 * @param shape1 The shape to exclude.
 * @param shape2 The shape to exclude from.
 * @returns The shape that results from excluding `shape1` from `shape2`.
 */
export function excludeShape(
  shape1: Vector2[][],
  shape2: Vector2[][],
): Vector2[][][] {
  const overlay = Overlay.new_with_subj_and_clip(
    shape1.map(p => p.map(p => p.a)),
    shape2.map(p => p.map(p => p.a)),
  );

  if (!overlay) {
    throw new Error('Failed to create overlay');
  }

  const result = overlay.overlay(OverlayRule.Difference, FillRule.NonZero);
  console.log({ shape1, shape2, result });
  return result.map(shape =>
    shape.map(polygon => polygon.map(([x, y]) => new Vector2(x, y))),
  );
}
