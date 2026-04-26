import z from "zod";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema, type PathInfo } from "./levelObject";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { Vec2Schema } from "@/utils/data";
import { $scene } from "@/scenes/state";
import { PlayScene } from "@/scenes/playScene";
import { PolyObject, type CollisionInfo } from "./polyObject";
import { AABB } from "@/utils/aabb";
import { LAYERS } from "../levelConfig";
import { CircleObject } from "./circleObject";

export const RigidBodySchema = LevelObjectSchema.extend({
  scale: Vec2Schema.refine((v) => v.x > 0 && v.y > 0, {
    message: "Scale must be positive",
  })
    .refine((v) => v.x === v.y, {
      message: "RigidBody must be a circle",
    })
    .default(new Vector2(1, 1)),
  mass: z.number().positive().default(1),
  velocity: Vec2Schema.default(new Vector2(0, 0)),
});

const DRAG_COEFFICIENT = 0.98;

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
  private constraint: Constraint | null = null;

  constructor(options: z.input<SchemaType>) {
    super(options);
    this.velocity = this.data.velocity;
    this.prevPos = this.pos;
    this.rigidBodyId = RigidBody.nextRigidBodyId++;
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
    const radius = this.scale.x / 2;
    return this.pos.sub(point).length() <= radius;
  }

  abstract getPathInfo(): PathInfo;

  override tick(): void {
    super.tick();
    this.prevPos = this.pos;
    const scene = $scene.get();
    if (!(scene instanceof PlayScene)) return;

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

    const collision = RigidBody.getEarliestWallCollision(
      scene,
      this.pos,
      this.scale.x / 2,
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
  }

  private resolveRigidBodyCollisions(scene: PlayScene): void {
    const myRadius = this.scale.x / 2;
    const myInvMass = 1 / this.data.mass;

    const constraint = this.getConstraint();

    for (const obj of scene.objects) {
      if (!(obj instanceof RigidBody) || obj === this) continue;
      const otherConstraint = obj.getConstraint();

      // Continue if constraints are different
      if (
        !constraint !== !otherConstraint ||
        (constraint &&
          otherConstraint &&
          (constraint.pos !== otherConstraint.pos ||
            constraint.radius !== otherConstraint.radius))
      ) {
        continue;
      }

      const pairKey =
        this.rigidBodyId < obj.rigidBodyId
          ? `${this.rigidBodyId}:${obj.rigidBodyId}`
          : `${obj.rigidBodyId}:${this.rigidBodyId}`;
      if (RigidBody.resolvedPairsThisFrame.has(pairKey)) continue;
      RigidBody.resolvedPairsThisFrame.add(pairKey);

      const otherRadius = obj.scale.x / 2;
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
    const maxDist = this.constraint.radius - this.scale.x / 2;
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
    this.velocity = this.velocity.add(springForce).mult(0.95);
  }

  private static getEarliestWallCollision(
    scene: PlayScene,
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
    scene: PlayScene,
    pos: Vector2,
    radius: number,
    delta: Vector2,
  ): Vector2 {
    const collision = this.getEarliestWallCollision(scene, pos, radius, delta);
    if (collision) return collision.hit;
    return pos.add(delta);
  }

  override render({ tickInterp }: RenderInfo): Iterable<RenderPass> {
    const pathInfo = this.getPathInfo();

    const pos = this.prevPos.lerp(this.pos, tickInterp);

    const shadowPath = new Path2D();
    shadowPath.arc(pos.x, pos.y, this.scale.x / 2, 0, Math.PI * 2);
    const outlinePath = new Path2D();
    outlinePath.arc(pos.x, pos.y, this.scale.x / 2, 0, Math.PI);
    outlinePath.arc(
      pos.x,
      pos.y - pathInfo.height,
      this.scale.x / 2,
      Math.PI,
      0,
    );
    const fillPath = new Path2D();
    fillPath.arc(
      pos.x,
      pos.y - pathInfo.height,
      this.scale.x / 2 - pathInfo.outline,
      0,
      Math.PI * 2,
    );

    const paths = this.renderPaths({
      shadowPath,
      heightPath: undefined as unknown as Path2D,
      fillPath,
      outlinePath,
      ...pathInfo,
      height: 0,
    });

    if (this.data.debug) {
      paths.push(
        pass(LAYERS.DEBUG, (ctx) => {
          ctx.strokeStyle = "#f00";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.arc(this.pos.x, this.pos.y, this.scale.x / 2, 0, Math.PI * 2);
          ctx.stroke();
        }),
      );
    }
    return paths;
  }

  override reset(): void {
    super.reset();
    this.velocity = this.data.velocity;
    this.prevPos = this.pos;
    this.constraint = null;
  }
}
