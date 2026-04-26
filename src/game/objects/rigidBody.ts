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

export abstract class RigidBody<
  SchemaType extends typeof RigidBodySchema = typeof RigidBodySchema,
> extends LevelObject<SchemaType> {
  static override schema = RigidBodySchema;

  public prevPos: Vector2;
  public velocity: Vector2;

  constructor(options: z.input<SchemaType>) {
    super(options);
    this.velocity = this.data.velocity;
    this.prevPos = this.pos;
  }

  getAABB(): AABB {
    return new AABB(
      this.pos.sub(this.scale.mult(0.5)),
      this.pos.add(this.scale.mult(0.5)),
    );
  }

  getMovementAABB(): AABB {
    return this.getAABB().expandVec(this.velocity);
  }

  abstract getPathInfo(): PathInfo;

  override tick(): void {
    super.tick();
    this.prevPos = this.pos;
    const scene = $scene.get();
    if (!(scene instanceof PlayScene)) return;
    const movementAABB = this.getMovementAABB();
    const polys = scene.objects.filter(
      (obj): obj is PolyObject =>
        obj instanceof PolyObject && obj.getAABB().intersects(movementAABB),
    );

    let collision: CollisionInfo | null = null;
    for (const poly of polys) {
      const polyCollision = poly.getCollision(
        this.pos,
        this.scale.x / 2,
        this.velocity,
      );
      if (!polyCollision) continue;
      if (!collision || polyCollision.time < collision.time) {
        collision = polyCollision;
      }
    }

    if (collision) {
      this.pos = collision.hit;
      this.velocity = collision.newVelocity;
    } else {
      this.pos = this.pos.add(this.velocity);
    }
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
      fillPath,
      outlinePath,
      ...pathInfo,
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
}
