import z from "zod";
import { LAYERS } from "../levelConfig";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { CircleObject, CircleObjectSchema } from "./circleObject";
import { AABB } from "@/utils/aabb";
import type { Vector2 } from "@/utils/vec";
import { positiveNumberSchema, rgbSchema, stringSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";
import { getLevelScene } from "@/scenes/state";
import { Tee } from "./tee";

export const HoleSchema = CircleObjectSchema.extend({
  teeColor: rgbSchema.default("#f79d60"),
  radius: positiveNumberSchema.default(20),
  // TODO: make this a fancy ahh selection of tees
  nextTee: stringSchema.optional(),
  nextTeeDelay: positiveNumberSchema.default(0.5),
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

    if (this.data.nextTee) {
      const scene = getLevelScene();
      if (!scene) return;
      // TODO: make a better way to manage active tees
      for (const obj of scene.objects) {
        if (obj instanceof Tee) {
          obj.active = false;
          break;
        }
      }
      const nextTee = scene.objects.getById(this.data.nextTee);
      if (!nextTee || !(nextTee instanceof Tee)) {
        console.warn(
          `Hole ${this.id} has invalid nextTee id ${this.data.nextTee}`,
        );
        return;
      }
      nextTee.active = true;

      setTimeout(() => {
        nextTee.focusCamera();
      }, this.data.nextTeeDelay * 1000);
    }
  }

  override editorScale(scale: Vector2): void {
    this.set(
      "radius",
      ((this.radius + HOLE_OUTLINE_WIDTH) * (scale.x + scale.y)) / 2 -
        HOLE_OUTLINE_WIDTH,
    );
  }
}
registerLevelObject("hole", Hole);
