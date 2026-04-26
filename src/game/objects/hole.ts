import z from "zod";
import { LAYERS } from "../levelConfig";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { CircleObject, CircleObjectSchema } from "./circleObject";

export const HoleSchema = CircleObjectSchema.extend({});

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
