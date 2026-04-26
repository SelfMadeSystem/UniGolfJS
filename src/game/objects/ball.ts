import { rgbSchema } from "@/utils/data";
import { RigidBody, RigidBodySchema } from "./rigidBody";
import type z from "zod";
import { LAYERS } from "../levelConfig";
import type { PathInfo } from "./levelObject";

export const BallSchema = RigidBodySchema.extend({
  color: rgbSchema.default("#fff"),
});

export class Ball extends RigidBody<typeof BallSchema> {
  static override schema = BallSchema;

  constructor(options: z.input<typeof BallSchema>) {
    super(options);
  }

  getPathInfo(): PathInfo {
    return {
      shadowLayer: LAYERS.BALL,
      outlineLayer: LAYERS.BALL,
      fillLayer: LAYERS.BALL,
      outlineColor: "#000",
      fillColor: this.data.color,
      height: 4,
      outline: 2,
    };
  }
}
