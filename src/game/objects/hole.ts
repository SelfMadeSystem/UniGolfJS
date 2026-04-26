import z from "zod";
import { LAYERS } from "../levelConfig";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { CircleObject, CircleObjectSchema } from "./circleObject";
import { Vector2 } from "@/utils/vec";
import { Vec2Schema } from "@/utils/data";

export const HoleSchema = CircleObjectSchema.extend({
  scale: Vec2Schema.refine((v) => v.x > 0 && v.y > 0, {
    message: "Scale must be positive",
  })
    .refine((v) => v.x === v.y, {
      message: "CircleObject must be a circle",
    })
    .default(new Vector2(30, 30)),
});

export class Hole extends CircleObject<typeof HoleSchema> {
  static override schema = HoleSchema;

  constructor(options: z.input<typeof HoleSchema>) {
    super(options);
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: 0,
      heightLayer: 0,
      outlineLayer: LAYERS.HOLE_OUTLINE,
      fillLayer: LAYERS.HOLE_FILL,
      outlineColor: this.data.teeColor,
      fillColor: "#000000",
      height: 0,
      outline: 4,
    };
  }

  override intersectsRigidBody(rigidBody: RigidBody): boolean {
    if (rigidBody.scale.x > this.scale.x) return false; // If the ball is larger than the hole, it can't intersect
    return super.intersectsRigidBody(rigidBody);
  }

  override onIntersects(rigidBody: RigidBody): void {
    rigidBody.setConstraint({
      pos: this.pos,
      radius: this.scale.x / 2,
    });
  }
}
