import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { blendColors } from "@/utils/colorUtils";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { Vec2Schema } from "@/utils/data";
import { Vector2 } from "@/utils/vec";
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
      outlineLayer: LAYERS.HOLE,
      fillLayer: LAYERS.HOLE,
      outlineColor: this.data.teeColor,
      fillColor: "#000000",
      height: 0,
      outline: 4,
    };
  }

  override onIntersects(rigidBody: RigidBody): void {
    rigidBody.setConstraint({
      pos: this.pos,
      radius: this.scale.x / 2,
    });
  }
}
