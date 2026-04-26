import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { type RenderInfo, type RenderPass } from "@/render/drawable";

export const WaterSchema = PolyObjectSchema.extend({});

const OUTLINE_COLOR = "#4060FF";
const FILL_COLOR = "#40A0FF";

export class Water extends PolyObject<typeof WaterSchema> {
  static override schema = WaterSchema;

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof WaterSchema>) {
    super(options);
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    return [...super.render(info)];
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: LAYERS.WALL_SHADOW,
      heightLayer: 0,
      outlineLayer: 0,
      fillLayer: LAYERS.WATER_FILL,
      outlineColor: OUTLINE_COLOR,
      fillColor: FILL_COLOR,
      height: 0,
      outline: 0,
      shadowColor: this.data.wallShadowColor,
      shadow: WALL_CONFIG.shadow,
    };
  }

  override intersectsRigidBody(rigidBody: RigidBody): boolean {
    return this.containsRigidBody(rigidBody);
  }

  override onIntersects(rigidBody: RigidBody): void {
    rigidBody.inWater = true;
  }
}
