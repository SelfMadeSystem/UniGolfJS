import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { blendColors } from "@/utils/colorUtils";

export const BoostSchema = PolyObjectSchema.extend({});

export class Boost extends PolyObject<typeof BoostSchema> {
  static override schema = BoostSchema;
  public boostTime: number = 0;

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof BoostSchema>) {
    super(options);
  }

  override tick(): void {
    super.tick();
    if (this.boostTime > 0) {
      this.boostTime--;
    }
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: 0,
      heightLayer: 0,
      outlineLayer: LAYERS.OBJECTS_1,
      fillLayer: LAYERS.OBJECTS_2,
      outlineColor: "#00FF00",
      fillColor: blendColors("#66FF00", "#FFFF00", this.boostTime / 60),
      height: 0,
      outline: WALL_CONFIG.outline,
    };
  }

  override onIntersects(rigidBody: RigidBody): void {
    const SPEED = 15;
    rigidBody.velocity = rigidBody.velocity.setLength(SPEED);
    this.boostTime = 60;
  }
}
