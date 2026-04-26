import { lineLineIntersection } from "./line";
import { mod } from "./mathUtils";
import { Vector2 } from "./vec";

/**
 * Clips a line segment to specified bounds.
 */
export function clipLineSegment(
  start: Vector2,
  end: Vector2,
  left: number,
  right: number,
  top: number,
  bottom: number,
): { start: Vector2; end: Vector2 } | null {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  let t0 = 0;
  let t1 = 1;

  const p = [-dx, dx, -dy, dy];
  const q = [start.x - left, right - start.x, start.y - top, bottom - start.y];

  for (let i = 0; i < 4; i++) {
    const qi = q[i]!;
    const pi = p[i]!;

    if (pi === 0) {
      if (qi < 0) return null; // Line is parallel and outside the bounds
    } else {
      const t = qi / pi;
      if (pi < 0) {
        t0 = Math.max(t0, t);
      } else {
        t1 = Math.min(t1, t);
      }
    }
  }

  if (t0 > t1) return null; // No intersection

  return {
    start: new Vector2(start.x + t0 * dx, start.y + t0 * dy),
    end: new Vector2(start.x + t1 * dx, start.y + t1 * dy),
  };
}

/**
 * Moves a line segment by a specified distance in the direction perpendicular to the line.
 *
 * This "grows" the line segment outward when it's part of a polygon whose points are in clockwise order, and "shrinks" it inward when the points are in counterclockwise order.
 */
export function offsetLineSegment(
  start: Vector2,
  end: Vector2,
  distance: number,
): { start: Vector2; end: Vector2 } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return { start, end }; // Degenerate line segment

  const offsetX = (dy / length) * distance;
  const offsetY = (-dx / length) * distance;

  return {
    start: new Vector2(start.x + offsetX, start.y + offsetY),
    end: new Vector2(end.x + offsetX, end.y + offsetY),
  };
}

/**
 * Returns the intersection point of two line segments offset by a specified distance, or null if they don't intersect.
 */
export function offsetLineSegmentIntersection(
  a1: Vector2,
  a2: Vector2,
  b1: Vector2,
  b2: Vector2,
  distance: number,
): Vector2 | null {
  const offsetA = offsetLineSegment(a1, a2, distance);
  const offsetB = offsetLineSegment(b1, b2, distance);
  return lineLineIntersection(
    offsetA.start,
    offsetA.end,
    offsetB.start,
    offsetB.end,
  );
}

/**
 * Returns a set of points in clockwise order.
 */
export function generateClockwisePoints(points: Vector2[]): Vector2[] {
  // Calculate the signed area of the polygon formed by the points
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const curr = points[i]!;
    const next = points[mod(i + 1, points.length)]!;
    area += curr.x * next.y - next.x * curr.y;
  }

  // If the area is negative, the points are in clockwise order, so we can return them as is
  if (area < 0) {
    return points;
  }

  // Otherwise, we need to reverse the order to make them clockwise
  return [...points].reverse();
}

export function generateCounterClockwisePoints(points: Vector2[]): Vector2[] {
  return generateClockwisePoints(points).reverse();
}

export function generatePathsFromPoints(
  points: Vector2[],
  outline: number,
  height?: number,
): {
  shadowPath: Path2D;
  outlinePath: Path2D;
  fillPath: Path2D;
} {
  points = generateCounterClockwisePoints(points);
  const shadowPath = new Path2D();
  const outlinePath = new Path2D();
  const fillPath = new Path2D();

  let right = -Infinity;
  let left = Infinity;
  let top = Infinity;
  let bottom = -Infinity;

  for (const point of points) {
    const { x, y } = point;
    if (x < left) left = x;
    if (x > right) right = x;
    if (y < top) top = y;
    if (y > bottom) bottom = y;
  }

  left -= outline;
  right += outline;
  top -= outline;
  bottom += outline;

  const newPoints: Vector2[] = [];

  for (let i = 0; i < points.length; i++) {
    const prev = points[mod(i - 1, points.length)]!;
    const curr = points[i]!;
    const next = points[mod(i + 1, points.length)]!;

    const offsetPrev = offsetLineSegment(prev, curr, outline);
    const offsetNext = offsetLineSegment(curr, next, outline);

    const intersection = lineLineIntersection(
      offsetPrev.start,
      offsetPrev.end,
      offsetNext.start,
      offsetNext.end,
    );

    if (!intersection) {
      throw new Error("Failed to calculate intersection");
    }

    let a = intersection;
    let b: Vector2 | null = null;

    if (
      intersection.x < left ||
      intersection.x > right ||
      intersection.y < top ||
      intersection.y > bottom
    ) {
      const prevClip = clipLineSegment(
        offsetPrev.start,
        intersection,
        left,
        right,
        top,
        bottom,
      );
      const nextClip = clipLineSegment(
        intersection,
        offsetNext.end,
        left,
        right,
        top,
        bottom,
      );

      if (!prevClip || !nextClip) {
        throw new Error("Failed to clip line segments");
      }

      a = prevClip.end;
      b = nextClip.start;
    }

    const op = i === 0 ? "moveTo" : "lineTo";

    shadowPath[op](...a.a);
    fillPath[op](curr.x, curr.y - (height ?? 0));

    if (b) {
      shadowPath.lineTo(...b.a);
    }

    newPoints.push(a);
    if (b) newPoints.push(b);
  }

  shadowPath.closePath();
  fillPath.closePath();

  if (height) {
    for (let i = 0; i < newPoints.length; i++) {
      const curr = newPoints[i]!;
      const next = newPoints[mod(i + 1, newPoints.length)]!;

      const currH = new Vector2(curr.x, curr.y - height);
      const nextH = new Vector2(next.x, next.y - height);

      const cw = generateClockwisePoints([curr, currH, nextH, next]);

      for (let j = 0; j < cw.length; j++) {
        const p = cw[j]!;
        const op = j === 0 ? "moveTo" : "lineTo";
        outlinePath[op](...p.a);
      }

      outlinePath.closePath();
    }
  }

  for (let i = 0; i < newPoints.length; i++) {
    const curr = newPoints[newPoints.length - i - 1]!;
    const op = i === 0 ? "moveTo" : "lineTo";
    outlinePath[op](...curr.a);
  }
  outlinePath.closePath();

  return { shadowPath, outlinePath, fillPath };
}
