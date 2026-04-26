import z from "zod";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema, type PathInfo } from "./levelObject";
import type { RenderInfo, RenderPass } from "@/render/drawable";
import { Vec2Schema } from "@/utils/data";

export const RigidBodySchema = LevelObjectSchema.extend({
  scale: Vec2Schema.refine((v) => v.x > 0 && v.y > 0, {
    message: "Scale must be positive",
  })
    .refine((v) => v.x === v.y, {
      message: "RigidBody must be a circle",
    })
    .default(new Vector2(1, 1)),
  mass: z.number().positive().default(1),
});

export abstract class RigidBody<
  SchemaType extends typeof RigidBodySchema = typeof RigidBodySchema,
> extends LevelObject<SchemaType> {
  static override schema = RigidBodySchema;

  public velocity: Vector2 = new Vector2(0, 0);

  constructor(options: z.input<SchemaType>) {
    super(options);
  }

  getAABB(): { tl: Vector2; br: Vector2 } {
    return {
      tl: this.pos.sub(this.scale.mult(0.5)),
      br: this.pos.add(this.scale.mult(0.5)),
    };
  }

  abstract getPathInfo(): PathInfo;

  override render(info: RenderInfo): Iterable<RenderPass> {
    const pathInfo = this.getPathInfo();

    const shadowPath = new Path2D();
    shadowPath.arc(
      this.pos.x,
      this.pos.y,
      this.scale.x / 2 + pathInfo.outline,
      0,
      Math.PI * 2,
    );
    const outlinePath = new Path2D();
    outlinePath.arc(
      this.pos.x,
      this.pos.y,
      this.scale.x / 2 + pathInfo.outline,
      0,
      Math.PI,
    );
    outlinePath.arc(
      this.pos.x,
      this.pos.y - pathInfo.height,
      this.scale.x / 2 + pathInfo.outline,
      Math.PI,
      0,
    );
    const fillPath = new Path2D();
    fillPath.arc(
      this.pos.x,
      this.pos.y - pathInfo.height,
      this.scale.x / 2,
      0,
      Math.PI * 2,
    );

    return this.renderPaths({
      shadowPath,
      fillPath,
      outlinePath,
      ...pathInfo,
    });
  }
}
