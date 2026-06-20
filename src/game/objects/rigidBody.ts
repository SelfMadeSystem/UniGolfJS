import { LAYERS } from '../levelConfig';
import { CircleObject } from './circleObject';
import { Floor } from './floor';
import { LevelObject, LevelObjectSchema, type PathInfo } from './levelObject';
import { PolyObject } from './polyObject';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelConfig, getLevelScene } from '@/scenes/state';
import { AABB } from '@/utils/aabb';
import { Vec2Schema, positiveNumberSchema } from '@/utils/data';
import { lerp } from '@/utils/mathUtils';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const RigidBodySchema = LevelObjectSchema.extend({
  radius: positiveNumberSchema.default(12.5),
  mass: positiveNumberSchema.default(1),
  velocity: Vec2Schema.default(new Vector2(0, 0)).meta({
    showInEditor: true,
    relativeTo: 'pos',
    multiplier: 10,
  }),
});

const WATER_ANIMATION_TIME = 10;
const WATER_ANIMATION_SPEED_INFLUENCE = 0.5;

export type Constraint = {
  pos: Vector2;
  radius: number;
};

export abstract class RigidBody<
  SchemaType extends typeof RigidBodySchema = typeof RigidBodySchema,
> extends LevelObject<SchemaType> {
  static override schema = RigidBodySchema;

  public prevPos: Vector2;
  public velocity: Vector2;
  public constraint: Constraint | null = null;
  public inWater = false;
  protected waterAnimation = 0;

  constructor(options: z.input<SchemaType>) {
    super(options);
    this.velocity = this.data.velocity;
    this.prevPos = this.pos;
    //@ts-expect-error abstract classes don't work well with generic schemas
    this.on('radius', () => {
      this.emitAabbChange();
    });
  }

  public get radius(): number {
    return this.data.radius;
  }

  public get mass(): number {
    return this.data.mass;
  }

  public get totalMass(): number {
    return this.radius * this.mass;
  }

  getBaseAABB(): AABB {
    return AABB.fromCenterSize(this.pos, [this.radius * 2, this.radius * 2]);
  }

  override getAABB(): AABB {
    return this.getBaseAABB();
  }

  override setAABB(aabb: AABB): void {
    if (aabb.width !== aabb.height) {
      console.warn('RigidBody: aabb.width and aabb.height not same.', aabb);
    }
    //@ts-expect-error abstract classes don't work well with generic schemas
    this.set('radius', aabb.width / 2);
    //@ts-expect-error abstract classes don't work well with generic schemas
    this.set('position', aabb.center);
  }

  getMovementAABB(): AABB {
    return this.getBaseAABB().expandVec(this.velocity);
  }

  override getPath(): Path2D {
    const path = new Path2D();
    path.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
    return path;
  }

  setConstraint(constraint: Constraint | null): void {
    this.constraint = constraint;
  }

  getConstraint(): Constraint | null {
    return this.constraint;
  }

  canCollide(other: RigidBody): boolean {
    if (this.inWater || other.inWater) return false;
    if (other.constraint === this.constraint) return true;
    if (!other.constraint || !this.constraint) return false;

    return (
      other.constraint.radius === this.constraint.radius &&
      other.constraint.pos.equals(this.constraint.pos)
    );
  }

  override isPointInside(point: Vector2): boolean {
    if (this.inWater) return false;
    const radius = this.radius;
    return this.pos.sub(point).length() <= radius;
  }

  abstract getPathInfo(): PathInfo;

  override tick(): void {
    super.tick();
    this.prevPos = this.pos;
    const scene = getLevelScene();
    if (!scene) return;

    if (this.inWater) {
      this.waterAnimation += 1;
      this.pos = this.pos.add(this.velocity);
      this.velocity = this.velocity.mult(0.9);
      return;
    }

    if (!this.constraint) {
      for (const obj of scene.objects.queryByBBox(this.getBaseAABB())) {
        if (
          obj instanceof PolyObject &&
          !obj.isSolid &&
          obj.intersectsRigidBody(this)
        ) {
          obj.onIntersects(this);
        }
        if (obj instanceof CircleObject && obj.intersectsRigidBody(this)) {
          obj.onIntersects(this);
        }
      }
    }

    if (this.inWater) return;
  }

  getPhysicsConfig(): {
    dragCoefficient: number;
    frictionForce: number;
  } {
    const scene = getLevelScene()!;
    const objects = scene.getObjectsAtPoint(this.pos);
    for (const obj of objects) {
      if (obj instanceof Floor) {
        return {
          dragCoefficient: obj.dragCoefficient,
          frictionForce: obj.frictionForce,
        };
      }
    }
    return getLevelConfig();
  }

  postPhysics(): void {
    const { dragCoefficient, frictionForce } = this.getPhysicsConfig();

    this.velocity = this.velocity.mult(dragCoefficient);
    const lenSq = this.velocity.lenSq();
    if (lenSq > frictionForce) {
      this.velocity = this.velocity.sub(this.velocity.setLength(frictionForce));
    } else {
      this.velocity = this.velocity.mult(1 - frictionForce);
    }
    this.resolveConstraint();
  }

  resolveConstraint(): void {
    if (!this.constraint) return;
    const delta = this.pos.sub(this.constraint.pos);
    const distSq = delta.lenSq();
    const maxDist = this.constraint.radius - this.radius;
    const maxDistSq = maxDist * maxDist;

    if (distSq > maxDistSq) {
      const dist = Math.sqrt(distSq);
      const correction = delta.mult((dist - maxDist) / dist);
      this.pos = this.pos.sub(correction);

      // Reflect velocity if moving outward
      const velAlongNormal = this.velocity.dot(delta.normalize());
      if (velAlongNormal > 0) {
        this.velocity = this.velocity.sub(
          delta.normalize().mult(2 * velAlongNormal),
        );
      }
    }

    // Spring toward center
    const SPRING_STRENGTH = 0.1;
    const desiredPos = this.constraint.pos;
    const springForce = desiredPos.sub(this.pos).mult(SPRING_STRENGTH);
    this.velocity = this.velocity
      .add(springForce)
      .mult(getLevelConfig().constrainedDragMultiplier);
  }

  override *render({ tickInterp }: RenderInfo): Iterable<RenderPass> {
    const pathInfo = this.getPathInfo();

    const scene = getLevelScene();

    const pos = this.prevPos.lerp(this.pos, scene?.playing ? tickInterp : 1);

    let { radius } = this;
    let height = pathInfo.height ?? 0;

    if (this.inWater) {
      const anim = this.waterAnimation + tickInterp;
      const speed = this.velocity.length();
      const speedInfluence = 1 + speed * WATER_ANIMATION_SPEED_INFLUENCE;
      const interp = (anim / WATER_ANIMATION_TIME) * speedInfluence;
      radius = lerp(radius, 0, interp);
      height = lerp(height, 0, interp);
    }

    if (radius <= (pathInfo.outline ?? 0)) return;

    const shadowPath = new Path2D();
    shadowPath.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    const outlinePath = new Path2D();
    outlinePath.arc(pos.x, pos.y, radius, 0, Math.PI);
    outlinePath.arc(pos.x, pos.y - height, radius, Math.PI, 0);
    const fillPath = new Path2D();
    fillPath.arc(
      pos.x,
      pos.y - height,
      radius - (pathInfo.outline ?? 0),
      0,
      Math.PI * 2,
    );

    yield* RigidBody.renderPaths({
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
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }

  override getState(): Record<string, unknown> {
    const { prevPos, velocity, constraint, inWater, waterAnimation } = this;
    return {
      ...super.getState(),
      prevPos,
      velocity,
      constraint,
      inWater,
      waterAnimation,
    };
  }

  override loadState(state: Record<string, unknown>): void {
    super.loadState(state);
    const { prevPos, velocity, constraint, inWater, waterAnimation } = state;
    this.prevPos = prevPos as Vector2;
    this.velocity = velocity as Vector2;
    this.constraint = constraint as Constraint | null;
    this.inWater = inWater as boolean;
    this.waterAnimation = waterAnimation as number;
  }

  override editorScale(scale: Vector2): void {
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set('radius', (this.radius * (scale.x + scale.y)) / 2);
  }

  override sceneReset(scene: LevelScene): void {
    super.sceneReset(scene);
    this.velocity = this.data.velocity;
    this.prevPos = this.data.position;
  }
}
