import { LAYERS } from '../levelConfig';
import { LevelObject, LevelObjectSchema, type PathInfo } from './levelObject';
import type { RigidBody } from './rigidBody';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import { AABB } from '@/utils/aabb';
import { positiveNumberSchema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const CircleObjectSchema = LevelObjectSchema.extend({
  radius: positiveNumberSchema.default(10),
});

export type Constraint = {
  pos: Vector2;
  radius: number;
};

export abstract class CircleObject<
  SchemaType extends typeof CircleObjectSchema = typeof CircleObjectSchema,
> extends LevelObject<SchemaType> {
  static override schema = CircleObjectSchema;

  constructor(options: z.input<SchemaType>) {
    super(options);
    //@ts-expect-error abstract classes don't work well with generic schemas
    this.on('radius', () => {
      this.emitAabbChange();
    });
  }

  public get radius(): number {
    return this.data.radius;
  }

  override getAABB(): AABB {
    return AABB.fromCenterSize(this.pos, [this.radius * 2, this.radius * 2]);
  }

  override getPath(): Path2D {
    const path = new Path2D();
    path.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    return path;
  }

  override isPointInside(point: Vector2): boolean {
    return this.pos.sub(point).length() <= this.data.radius;
  }

  abstract getPathInfo(): PathInfo;

  override *render(info: RenderInfo): Iterable<RenderPass> {
    const pathInfo = this.getPathInfo();

    const { pos } = this;

    const shadowPath = new Path2D();
    shadowPath.arc(
      pos.x,
      pos.y,
      this.data.radius + (pathInfo.outline ?? 0),
      0,
      Math.PI * 2,
    );
    const outlinePath = new Path2D();
    outlinePath.arc(
      pos.x,
      pos.y,
      this.data.radius + (pathInfo.outline ?? 0),
      0,
      Math.PI,
    );
    outlinePath.arc(
      pos.x,
      pos.y - (pathInfo.height ?? 0),
      this.data.radius + (pathInfo.outline ?? 0),
      Math.PI,
      0,
    );
    const fillPath = new Path2D();
    fillPath.arc(
      pos.x,
      pos.y - (pathInfo.height ?? 0),
      this.data.radius,
      0,
      Math.PI * 2,
    );

    yield* CircleObject.renderPaths({
      shadowPath,
      heightPath: undefined as unknown as Path2D,
      fillPath,
      outlinePath,
      ...pathInfo,
      height: 0,
    });

    if (this.data.debug) {
      yield pass(LAYERS.DEBUG, ctx => {
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.data.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }

  intersectsRigidBody(rigidBody: RigidBody): boolean {
    const radius = this.data.radius + rigidBody.radius;
    return this.pos.distSq(rigidBody.pos) <= radius * radius;
  }

  /**
   * Called when a RigidBody intersects with this PolyObject.
   * @param rigidBody The RigidBody intersecting with this PolyObject.
   */
  onIntersects(rigidBody: RigidBody): void {}

  override editorScale(scale: Vector2): void {
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set('radius', (this.radius * (scale.x + scale.y)) / 2);
  }
}
