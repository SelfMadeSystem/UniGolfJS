import { Vector2 } from "./vec";

/**
 * Represents an infinite line defined by two points
 */
export class Line {
  constructor(
    readonly a: Vector2,
    readonly b: Vector2,
  ) {}

  /**
   * Converts this infinite line to a finite segment between two points
   */
  toSegment(): Segment {
    return new Segment(this.a, this.b);
  }

  /**
   * Gets the intersection point with another line
   * (lines extend infinitely, parallel lines return null)
   */
  intersects(other: Line): Vector2 | null {
    return lineLineIntersection(this.a, this.b, other.a, other.b);
  }

  /**
   * Gets the perpendicular distance from a point to this infinite line
   */
  distanceToPoint(point: Vector2): number {
    const { a, b } = this;
    const line = b.sub(a);
    const pointToLine = a.sub(point);
    return Math.abs(line.cw90().dot(pointToLine)) / line.length();
  }

  toString(): string {
    return `Line(${this.a.toString()}, ${this.b.toString()})`;
  }
}

/**
 * Represents a finite line segment with start and end points
 */
export class Segment {
  constructor(
    readonly start: Vector2,
    readonly end: Vector2,
  ) {}

  /**
   * Converts this segment to an infinite line
   */
  toLine(): Line {
    return new Line(this.start, this.end);
  }

  /**
   * Gets the length squared of this segment
   */
  lengthSq(): number {
    return this.start.distSq(this.end);
  }

  /**
   * Gets the length of this segment
   */
  length(): number {
    return Math.sqrt(this.lengthSq());
  }

  /**
   * Gets the midpoint of this segment
   */
  midpoint(): Vector2 {
    return this.start.add(this.end).mult(0.5);
  }

  /**
   * Gets the direction vector from start to end (not normalized)
   */
  direction(): Vector2 {
    return this.end.sub(this.start);
  }

  /**
   * Gets the normalized direction vector from start to end
   */
  normalizedDirection(): Vector2 {
    return this.direction().normalize();
  }

  /**
   * Gets the perpendicular vector to this segment (normalized)
   */
  perpendicular(): Vector2 {
    return this.direction().cw90().normalize();
  }

  /**
   * Determines which side of the segment a point is on (positive on one side, negative on the other, zero if on the line)
   */
  side(point: Vector2): number {
    return this.direction().cw90().dot(point.sub(this.start));
  }

  /**
   * Gets the normal vector pointing from this segment to a given point (zero vector if point is on the line)
   */
  normalToPoint(point: Vector2): Vector2 {
    const sideValue = this.side(point);
    if (sideValue === 0) return new Vector2(0, 0); // Point is on the line
    return this.perpendicular().mult(Math.sign(sideValue));
  }

  /**
   * Gets the intersection point with another segment
   * (returns null if segments don't actually cross, even if lines would)
   */
  intersects(other: Segment): Vector2 | null {
    const intersection = lineLineIntersection(
      this.start,
      this.end,
      other.start,
      other.end,
    );
    if (!intersection) return null;

    // Check if intersection is within both segments
    if (
      isPointOnSegment(intersection, this.start, this.end) &&
      isPointOnSegment(intersection, other.start, other.end)
    ) {
      return intersection;
    }
    return null;
  }

  /**
   * Gets the closest distance from a point to this segment
   */
  distanceToPoint(point: Vector2): number {
    const { start, end } = this;
    const l2 = start.distSq(end);
    if (l2 === 0) return point.dist(start);

    let t = point.sub(start).dot(end.sub(start)) / l2;
    t = Math.max(0, Math.min(1, t));

    const projection = start.add(end.sub(start).mult(t));
    return point.dist(projection);
  }

  /**
   * Gets the closest point on this segment to a given point
   */
  closestPointTo(point: Vector2): Vector2 {
    const l2 = this.lengthSq();
    if (l2 === 0) return this.start; // Degenerate segment

    let t = point.sub(this.start).dot(this.end.sub(this.start)) / l2;
    t = Math.max(0, Math.min(1, t));

    return this.start.add(this.end.sub(this.start).mult(t));
  }

  toString(): string {
    return `Segment(${this.start.toString()}, ${this.end.toString()})`;
  }
}

/**
 * Check if a point lies on a segment (within bounds)
 */
function isPointOnSegment(
  point: Vector2,
  start: Vector2,
  end: Vector2,
): boolean {
  const threshold = 1e-10;
  return (
    point.x >= Math.min(start.x, end.x) - threshold &&
    point.x <= Math.max(start.x, end.x) + threshold &&
    point.y >= Math.min(start.y, end.y) - threshold &&
    point.y <= Math.max(start.y, end.y) + threshold
  );
}

/**
 * Gets the intersection point of two infinite lines
 */
export function lineLineIntersection(
  a1: Vector2,
  a2: Vector2,
  b1: Vector2,
  b2: Vector2,
): Vector2 | null {
  const da = a2.sub(a1);
  const db = b2.sub(b1);
  const dp = a1.sub(b1);
  const dap = da.cw90();
  const denom = dap.dot(db);

  if (denom === 0) {
    return null; // parallel or collinear
  }

  const num = dap.dot(dp);
  return b1.add(db.mult(num / denom));
}
