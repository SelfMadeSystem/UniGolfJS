import z from "zod";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema, type PathInfo } from "./levelObject";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { positiveNumberSchema, Vec2Schema } from "@/utils/data";
import { getLevelScene } from "@/scenes/state";
import { LevelScene } from "@/scenes/levelScene";
import { PolyObject, type CollisionInfo } from "./polyObject";
import { AABB } from "@/utils/aabb";
import { LAYERS } from "../levelConfig";
import { CircleObject } from "./circleObject";
import { lerp } from "@/utils/mathUtils";

export const RigidBodySchema = LevelObjectSchema.extend({
  radius: positiveNumberSchema.default(12.5),
  mass: positiveNumberSchema.default(1),
  velocity: Vec2Schema.default(new Vector2(0, 0)),
});

const DRAG_COEFFICIENT = 0.99;
const FRICTION_FORCE = 0.35;
const CONSTRAINED_DRAG_MULTIPLIER = 0.9;
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
  private static nextRigidBodyId = 1;
  private static resolvedPairsThisFrame = new Set<string>();

  static beginFrame(): void {
    this.resolvedPairsThisFrame.clear();
  }

  public prevPos: Vector2;
  public velocity: Vector2;
  private readonly rigidBodyId: number;
  protected constraint: Constraint | null = null;
  public inWater = false;
  protected waterAnimation = 0;

  constructor(options: z.input<SchemaType>) {
    super(options);
    this.velocity = this.data.velocity;
    this.prevPos = this.pos;
    this.rigidBodyId = RigidBody.nextRigidBodyId++;
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

  setConstraint(constraint: Constraint | null): void {
    this.constraint = constraint;
  }

  getConstraint(): Constraint | null {
    return this.constraint;
  }

  getMovementAABB(): AABB {
    return this.getAABB().expandVec(this.velocity);
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

    for (const obj of scene.objects) {
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

    if (this.inWater) return;

    const collision = RigidBody.getEarliestWallCollision(
      scene,
      this.pos,
      this.radius,
      this.velocity,
    );

    if (collision) {
      const modifiedCollision = collision.object.onCollision(this, collision);
      this.pos = collision.hit;
      this.velocity = modifiedCollision.velocity;
    } else {
      this.pos = this.pos.add(this.velocity);
    }

    this.resolveRigidBodyCollisions(scene);

    this.resolveConstraint();

    this.velocity = this.velocity.mult(DRAG_COEFFICIENT);
    const lenSq = this.velocity.lenSq();
    if (lenSq > FRICTION_FORCE) {
      this.velocity = this.velocity.sub(
        this.velocity.setLength(FRICTION_FORCE),
      );
    } else {
      this.velocity = this.velocity.mult(1 - FRICTION_FORCE);
    }
  }

  private resolveRigidBodyCollisions(scene: LevelScene): void {
    const myRadius = this.radius;
    const myInvMass = 1 / this.data.mass;

    const constraint = this.getConstraint();

    for (const obj of scene.objects) {
      if (!(obj instanceof RigidBody) || obj === this) continue;
      const otherConstraint = obj.getConstraint();

      if (obj.inWater) continue;

      // Continue if constraints are different
      if (
        !constraint !== !otherConstraint ||
        (constraint &&
          otherConstraint &&
          (constraint.pos !== otherConstraint.pos ||
            constraint.radius !== otherConstraint.radius))
      )
        continue;

      const pairKey =
        this.rigidBodyId < obj.rigidBodyId
          ? `${this.rigidBodyId}:${obj.rigidBodyId}`
          : `${obj.rigidBodyId}:${this.rigidBodyId}`;
      if (RigidBody.resolvedPairsThisFrame.has(pairKey)) continue;
      RigidBody.resolvedPairsThisFrame.add(pairKey);

      const otherRadius = obj.radius;
      const delta = obj.pos.sub(this.pos);
      const distSq = delta.lenSq();
      const minDist = myRadius + otherRadius;
      const minDistSq = minDist * minDist;

      if (distSq >= minDistSq) continue;

      const dist = Math.sqrt(distSq);
      const normal = dist === 0 ? new Vector2(1, 0) : delta.div(dist);

      // Separate circles so they are no longer overlapping.
      const otherInvMass = 1 / obj.data.mass;
      const invMassSum = myInvMass + otherInvMass;
      const penetration = minDist - dist;
      const correction = normal.mult(penetration / invMassSum);
      const thisDelta = correction.mult(-myInvMass);
      const otherDelta = correction.mult(otherInvMass);
      this.pos = RigidBody.sweepPositionAgainstWalls(
        scene,
        this.pos,
        myRadius,
        thisDelta,
      );
      obj.pos = RigidBody.sweepPositionAgainstWalls(
        scene,
        obj.pos,
        otherRadius,
        otherDelta,
      );

      // Apply an elastic impulse if circles are moving toward each other.
      const relativeVelocity = obj.velocity.sub(this.velocity);
      const velAlongNormal = relativeVelocity.dot(normal);
      if (velAlongNormal > 0) continue;

      const restitution = 1;
      const impulseMagnitude =
        (-(1 + restitution) * velAlongNormal) / invMassSum;
      const impulse = normal.mult(impulseMagnitude);
      this.velocity = this.velocity.sub(impulse.mult(myInvMass));
      obj.velocity = obj.velocity.add(impulse.mult(otherInvMass));
    }
  }

  private resolveConstraint(): void {
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
      .mult(CONSTRAINED_DRAG_MULTIPLIER);
  }

  private static getEarliestWallCollision(
    scene: LevelScene,
    pos: Vector2,
    radius: number,
    velocity: Vector2,
  ): CollisionInfo | null {
    if (velocity.lenSq() === 0) return null;

    const radiusVec = new Vector2(radius, radius);
    const movementAABB = new AABB(
      pos.sub(radiusVec),
      pos.add(radiusVec),
    ).expandVec(velocity);

    const polys = scene.objects.filter(
      (obj): obj is PolyObject =>
        obj instanceof PolyObject &&
        obj.isSolid &&
        obj.getAABB().intersects(movementAABB),
    );

    let collision: CollisionInfo | null = null;
    for (const poly of polys) {
      const polyCollision = poly.getCollision(pos, radius, velocity);
      if (!polyCollision) continue;
      if (!collision || polyCollision.time < collision.time) {
        collision = polyCollision;
      }
    }

    return collision;
  }

  private static sweepPositionAgainstWalls(
    scene: LevelScene,
    pos: Vector2,
    radius: number,
    delta: Vector2,
  ): Vector2 {
    const collision = this.getEarliestWallCollision(scene, pos, radius, delta);
    if (collision) return collision.hit;
    return pos.add(delta);
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
      yield pass(LAYERS.DEBUG, (ctx) => {
        ctx.strokeStyle = "#f00";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
    }
  }

  override reset(): void {
    super.reset();
    this.velocity = this.data.velocity;
    this.prevPos = this.pos;
    this.constraint = null;
    this.inWater = false;
    this.waterAnimation = 0;
  }

  override editorScale(scale: Vector2): void {
    // @ts-expect-error abstract classes don't work well with generic schemas
    this.set("radius", (this.radius * (scale.x + scale.y)) / 2);
  }
}
