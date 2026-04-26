import z from "zod";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema, type PathInfo } from "./levelObject";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { Vec2Schema } from "@/utils/data";
import { LAYERS } from "../levelConfig";
import type { RigidBody } from "./rigidBody";

export const CircleObjectSchema = LevelObjectSchema.extend({
  scale: Vec2Schema.refine((v) => v.x > 0 && v.y > 0, {
    message: "Scale must be positive",
  })
    .refine((v) => v.x === v.y, {
      message: "CircleObject must be a circle",
    })
    .default(new Vector2(1, 1)),
  mass: z.number().positive().default(1),
  velocity: Vec2Schema.default(new Vector2(0, 0)),
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
  }

  override isPointInside(point: Vector2): boolean {
    const radius = this.scale.x / 2;
    return this.pos.sub(point).length() <= radius;
  }

  abstract getPathInfo(): PathInfo;

  override render(info: RenderInfo): Iterable<RenderPass> {
    const pathInfo = this.getPathInfo();

    const { pos } = this;

    const shadowPath = new Path2D();
    shadowPath.arc(
      pos.x,
      pos.y,
      this.scale.x / 2 + pathInfo.outline,
      0,
      Math.PI * 2,
    );
    const outlinePath = new Path2D();
    outlinePath.arc(
      pos.x,
      pos.y,
      this.scale.x / 2 + pathInfo.outline,
      0,
      Math.PI,
    );
    outlinePath.arc(
      pos.x,
      pos.y - pathInfo.height,
      this.scale.x / 2 + pathInfo.outline,
      Math.PI,
      0,
    );
    const fillPath = new Path2D();
    fillPath.arc(
      pos.x,
      pos.y - pathInfo.height,
      this.scale.x / 2,
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

  intersectsRigidBody(rigidBody: RigidBody): boolean {
    const radius = (this.scale.x + rigidBody.scale.x) / 2;
    return this.pos.distSq(rigidBody.pos) <= radius * radius;
  }

  /**
   * Called when a RigidBody intersects with this PolyObject.
   * @param rigidBody The RigidBody intersecting with this PolyObject.
   */
  onIntersects(rigidBody: RigidBody): void {}
}
