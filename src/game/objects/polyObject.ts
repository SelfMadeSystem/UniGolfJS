import z from "zod";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema, type PathInfo } from "./levelObject";
import type { RenderInfo, RenderPass } from "@/render/drawable";
import { AABB } from "@/utils/aabb";
import { Segment } from "@/utils/line";

export type CollisionInfo = {
  hit: Vector2;
  normal: Vector2;
  newVelocity: Vector2;
  time: number;
};

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
  inverseQuarterCircle: [
    new Vector2(0.5, 0.5),
    ...baseQuarterCirclePoints.toReversed(),
  ],
};

export abstract class PolyObject<
  SchemaType extends typeof PolyObjectSchema = typeof PolyObjectSchema,
> extends LevelObject<SchemaType> {
  static override schema = PolyObjectSchema;

  constructor(options: z.input<SchemaType>) {
    super(options);
  }

  getPoints(): Vector2[] {
    const { shape, rotation } = this.data;
    const basePoints = SHAPE_POINTS[shape];
    const rot = parseInt(rotation) as 0 | 90 | 180 | 270;
    return basePoints.map((p) => p.rot90(rot).mult(this.scale).add(this.pos));
  }

  getSegments(): Segment[] {
    const points = this.getPoints();
    const segments: Segment[] = [];
    for (let i = 0; i < points.length; i++) {
      const start = points[i]!;
      const end = points[(i + 1) % points.length]!;
      segments.push(new Segment(start, end));
    }
    return segments;
  }

  override isPointInside(point: Vector2): boolean {
    if (!this.getAABB().containsPoint(point)) return false;
    const segments = this.getSegments();
    let windingNumber = 0;
    for (const segment of segments) {
      const startToPoint = point.sub(segment.start);
      const endToPoint = point.sub(segment.end);
      if (segment.start.y <= point.y) {
        if (segment.end.y > point.y && startToPoint.cross(endToPoint) > 0) {
          windingNumber++;
        }
      } else {
        if (segment.end.y <= point.y && startToPoint.cross(endToPoint) < 0) {
          windingNumber--;
        }
      }
    }
    return windingNumber !== 0;
  }

  abstract getPathInfo(): PathInfo;

  override render(info: RenderInfo): Iterable<RenderPass> {
    const points = this.getPoints();
    const pathInfo = this.getPathInfo();
    return this.renderPoints({ points, ...pathInfo, debug: this.data.debug });
  }

  getCollision(
    pos: Vector2,
    radius: number,
    velocity: Vector2,
  ): CollisionInfo | null {
    const segments = this.getSegments();
    let earliestCollision: {
      hit: Vector2;
      normal: Vector2;
      time: number;
    } | null = null;

    for (const segment of segments) {
      const collision = this.circleSegmentCollision(
        pos,
        radius,
        velocity,
        segment,
      );
      if (
        collision &&
        (!earliestCollision || collision.time < earliestCollision.time)
      ) {
        earliestCollision = collision;
      }
    }

    if (!earliestCollision) return null;

    const { hit, normal, time } = earliestCollision;
    // Simple reflection for new velocity
    const newVelocity = velocity.sub(normal.mult(2 * velocity.dot(normal)));
    return { hit, normal, newVelocity, time };
  }

  /**
   * Assumes:
   * - segment is facing outwards from the shape (ccw)
   * - closed shape, so will never collide with the back
   */
  private circleSegmentCollision(
    pos: Vector2,
    radius: number,
    velocity: Vector2,
    segment: Segment,
  ): { hit: Vector2; normal: Vector2; time: number } | null {
    const segDir = segment.normalizedDirection();
    const segNormal = segDir.cw90();
    let earliestCollision: {
      hit: Vector2;
      normal: Vector2;
      time: number;
    } | null = null;

    // Check collision against the segment face.
    const relativePos = pos.sub(segment.start);
    const velAlongNormal = velocity.dot(segNormal);
    const distAlongNormal = relativePos.dot(segNormal);

    if (velAlongNormal < 0) {
      const timeToCollision = (radius - distAlongNormal) / velAlongNormal;
      if (timeToCollision >= 0 && timeToCollision <= 1) {
        const collisionPoint = pos.add(velocity.mult(timeToCollision));
        const segStartToCollision = collisionPoint.sub(segment.start);
        const projLength = segStartToCollision.dot(segDir);
        if (projLength >= 0 && projLength <= segment.length()) {
          earliestCollision = {
            hit: collisionPoint,
            normal: segNormal,
            time: timeToCollision,
          };
        }
      }
    }

    // Check collisions against both segment endpoints.
    const endpointCollision = (endpoint: Vector2) => {
      const a = velocity.lenSq();
      if (a === 0) return null;

      const relative = pos.sub(endpoint);
      const b = 2 * relative.dot(velocity);
      const c = relative.lenSq() - radius * radius;
      const discriminant = b * b - 4 * a * c;
      if (discriminant < 0) return null;

      const sqrtDiscriminant = Math.sqrt(discriminant);
      const t1 = (-b - sqrtDiscriminant) / (2 * a);
      const t2 = (-b + sqrtDiscriminant) / (2 * a);
      const time = t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : null;
      if (time === null) return null;

      const hit = pos.add(velocity.mult(time));
      const normal = hit.sub(endpoint).normalize();
      if (velocity.dot(normal) >= 0) return null;

      return { hit, normal, time };
    };

    const startCollision = endpointCollision(segment.start);
    if (
      startCollision &&
      (!earliestCollision || startCollision.time < earliestCollision.time)
    ) {
      earliestCollision = startCollision;
    }

    const endCollision = endpointCollision(segment.end);
    if (
      endCollision &&
      (!earliestCollision || endCollision.time < earliestCollision.time)
    ) {
      earliestCollision = endCollision;
    }

    return earliestCollision;
  }
}
