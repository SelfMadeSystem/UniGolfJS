import { LevelObject, LevelObjectSchema, type PathInfo } from './levelObject';
import type { RigidBody } from './rigidBody';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import { AABB } from '@/utils/aabb';
import {
  Vec2Schema,
  numberSchema,
  rotationSchema,
  shapeSchema,
} from '@/utils/data';
import { Segment } from '@/utils/line';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const PolyObjectSchema = LevelObjectSchema.extend({
  scale: Vec2Schema.default(new Vector2(40, 40)),
  shape: shapeSchema.default('rectangle'),
  rotation: rotationSchema.default(0),
  bounciness: numberSchema.default(1),
});

const CCW_ROT_TABLE = {
  '0': 90,
  '90': 180,
  '180': 270,
  '270': 0,
} as const;

const CW_ROT_TABLE = {
  '0': 270,
  '90': 0,
  '180': 90,
  '270': 180,
} as const;

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
  circle: Array.from({ length: 128 }, (_, i) => {
    const angle = (i / 128) * (2 * Math.PI);
    return new Vector2(Math.cos(angle), Math.sin(angle)).mult(0.5);
  }),
} as const;

export abstract class PolyObject<
  SchemaType extends typeof PolyObjectSchema = typeof PolyObjectSchema,
> extends LevelObject<SchemaType> {
  static override schema = PolyObjectSchema;

  constructor(options: z.input<SchemaType>) {
    super(options);
    //@ts-expect-error abstract classes don't work well with generic schemas
    this.on('scale', () => {
      this.emitAabbChange();
    });
  }

  get isSolid(): boolean {
    return true;
  }

  get scale(): Vector2 {
    return this.data.scale;
  }

  get bounciness(): number {
    return this.data.bounciness;
  }

  override getAABB(): AABB {
    return AABB.fromCenterSize(this.pos, this.scale);
  }

  getPoints(): Vector2[] {
    const { shape, rotation } = this.data;
    const basePoints = SHAPE_POINTS[shape];
    return basePoints.map(p =>
      p.rot90(rotation).mult(this.scale).add(this.pos),
    );
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

  override getPath(): Path2D {
    const path = new Path2D();
    const points = this.getPoints();
    if (points.length > 0) {
      path.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        path.lineTo(points[i]!.x, points[i]!.y);
      }
      path.closePath();
    }
    return path;
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

  abstract getPathInfo(info: RenderInfo): PathInfo;

  *polyRender(info: RenderInfo): Iterable<RenderPass> {
    const points = this.getPoints();
    const pathInfo = this.getPathInfo(info);
    yield* PolyObject.renderPoints({
      points,
      ...pathInfo,
      debug: this.data.debug,
    });
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

  /**
   * Called when a RigidBody collides with this PolyObject.
   */
  onCollision(rigidBody: RigidBody) {}

  /**
   * Called when a RigidBody intersects with this PolyObject.
   * @param rigidBody The RigidBody intersecting with this PolyObject.
   */
  onIntersects(rigidBody: RigidBody): void {}

  /**
   * Checks if a RigidBody is intersecting with this PolyObject.
   * @param rigidBody The RigidBody to check.
   * @returns True if the RigidBody is intersecting, false otherwise.
   */
  intersectsRigidBody(rigidBody: RigidBody): boolean {
    if (!this.getAABB().intersects(rigidBody.getAABB())) return false;
    if (this.isPointInside(rigidBody.pos)) return true;
    const segments = this.getSegments();
    for (const segment of segments) {
      if (segment.distanceToPoint(rigidBody.pos) <= rigidBody.radius) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if a RigidBody is fully contained within this PolyObject.
   * @param rigidBody The RigidBody to check.
   * @returns True if the RigidBody is fully contained, false otherwise.
   */
  containsRigidBody(rigidBody: RigidBody): boolean {
    // Check if the circle's AABB is fully contained within the PolyObject's AABB
    const circleAABB = rigidBody.getAABB();
    if (!this.getAABB().containsAABB(circleAABB)) {
      return false;
    }

    // Check if the circle's edge intersects any of the PolyObject's edges
    const segments = this.getSegments();
    for (const segment of segments) {
      const collision = this.circleSegmentCollision(
        rigidBody.pos,
        rigidBody.radius,
        new Vector2(0, 0), // No velocity, just checking for intersection
        segment,
      );
      if (collision) {
        return false;
      }
    }

    // If no intersections and AABB is contained, the circle is fully contained
    return true;
  }

  override editorScale(scale: Vector2): void {
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set('scale', this.scale.mult(scale));
  }

  override editorRotateCW(): void {
    this.editorRotateShapeCW();
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set('scale', this.scale.yx);
  }

  override editorRotateCCW(): void {
    this.editorRotateShapeCCW();
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set('scale', this.scale.yx);
  }

  override editorRotateShapeCCW(): void {
    const newRotation = CCW_ROT_TABLE[this.data.rotation];
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set('rotation', newRotation);
  }

  override editorRotateShapeCW(): void {
    const newRotation = CW_ROT_TABLE[this.data.rotation];
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set('rotation', newRotation);
  }
}
