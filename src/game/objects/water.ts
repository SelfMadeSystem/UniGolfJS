import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { getLevelScene } from "@/scenes/state";
import { rgbSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";

export const WaterSchema = PolyObjectSchema.extend({
  wallShadowColor: rgbSchema.default("#76b97e"),
  waterWallColor: rgbSchema.default("#779977"),
});

export class Water extends PolyObject<typeof WaterSchema> {
  static override schema = WaterSchema;

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof WaterSchema>) {
    super(options);
  }

  override *render(info: RenderInfo): Iterable<RenderPass> {
    yield* this.polyRender(info);
    const path = this.getPath();
    yield pass(LAYERS.WATER_WALL_CLIP_REGIONS, () => {
      const scene = getLevelScene();
      if (!scene) return;
      scene.clipPath.addPath(path);
    });
    yield pass(LAYERS.WATER_FILL, (ctx) => {
      ctx.fillStyle = this.data.waterWallColor;
      ctx.fill(path);
    });
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: LAYERS.WALL_SHADOW,
      heightLayer: 0,
      outlineLayer: 0,
      fillLayer: LAYERS.WATER_FILL,
      outlineColor: "transparent",
      fillColor: "transparent",
      height: 0,
      outline: 0,
      shadowColor: this.data.wallShadowColor,
      shadow: WALL_CONFIG.shadow,
    };
  }

  override intersectsRigidBody(rigidBody: RigidBody): boolean {
    return this.isPointInside(rigidBody.pos);
  }

  override onIntersects(rigidBody: RigidBody): void {
    rigidBody.inWater = true;
  }
}
registerLevelObject("water", Water);
