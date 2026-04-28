import z from "zod";
import { LAYERS } from "../levelConfig";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { CircleObject, CircleObjectSchema } from "./circleObject";
import { AABB } from "@/utils/aabb";
import type { Vector2 } from "@/utils/vec";

export const HoleSchema = CircleObjectSchema.extend({
  radius: z.number().positive().default(20),
});

const HOLE_OUTLINE_WIDTH = 5;

export class Hole extends CircleObject<typeof HoleSchema> {
  static override schema = HoleSchema;

  constructor(options: z.input<typeof HoleSchema>) {
    super(options);
  }

  override getAABB(): AABB {
    const totalRadius = this.radius + HOLE_OUTLINE_WIDTH;
    return AABB.fromCenterSize(this.pos, [totalRadius * 2, totalRadius * 2]);
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
      outline: HOLE_OUTLINE_WIDTH,
    };
  }

  override intersectsRigidBody(rigidBody: RigidBody): boolean {
    if (rigidBody.radius > this.radius) return false; // If the ball is larger than the hole, it can't intersect
    return super.intersectsRigidBody(rigidBody);
  }

  override onIntersects(rigidBody: RigidBody): void {
    rigidBody.setConstraint({
      pos: this.pos,
      radius: this.radius,
    });
  }

  override editorScale(scale: Vector2): void {
    this.set(
      "radius",
      ((this.radius + HOLE_OUTLINE_WIDTH) * (scale.x + scale.y)) / 2 -
        HOLE_OUTLINE_WIDTH,
    );
  }
}
