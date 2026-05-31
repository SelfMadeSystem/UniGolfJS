import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { blendColors } from "@/utils/colorUtils";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { registerLevelObject } from "../levelObjectRegistry";
import { numberSchema } from "@/utils/data";

export const BoostSchema = PolyObjectSchema.extend({
  speed: numberSchema.default(60),
});
// TODO: put these in a better place
export const BOOST_EFFECT_TIME = 10; // frames

const C1 = "#66FF00";
const C2 = "#FFFF00";

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

  override *render(info: RenderInfo): Iterable<RenderPass> {
    yield* this.polyRender(info);
    yield pass(LAYERS.OBJECTS_3, (ctx) => {
      const { tickWithInterp } = info;
      const path = this.getPath();
      const gradient = ctx.createRadialGradient(
        this.pos.x,
        this.pos.y,
        0,
        this.pos.x,
        this.pos.y,
        Math.hypot(this.scale.x, this.scale.y),
      );

      const t = tickWithInterp / 15;

      const c1 = blendColors(C1 + "00", C2, this.boostTime / BOOST_EFFECT_TIME);

      gradient.addColorStop(
        0,
        blendColors(c1, C2, Math.abs(((t + 1) % 2) - 1)),
      );
      gradient.addColorStop(
        t % 1,
        blendColors(c1, C2, Math.sign((t % 2) - 1) * 0.5 + 0.5),
      );
      gradient.addColorStop(1, blendColors(c1, C2, Math.abs((t % 2) - 1)));

      ctx.fillStyle = gradient;
      ctx.fill(path);
    });
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: 0,
      heightLayer: 0,
      outlineLayer: LAYERS.OBJECTS_1,
      fillLayer: LAYERS.OBJECTS_2,
      outlineColor: "#00FF00",
      fillColor: blendColors(C1, C2, this.boostTime / BOOST_EFFECT_TIME),
      height: 0,
      outline: WALL_CONFIG.outline,
    };
  }

  override onIntersects(rigidBody: RigidBody): void {
    if (rigidBody.velocity.length() === 0) return;

    rigidBody.velocity = rigidBody.velocity.setLength(this.data.speed);
    this.boostTime = BOOST_EFFECT_TIME;
  }

  override reset(): void {
    super.reset();
    this.boostTime = 0;
  }
}
registerLevelObject("boost", Boost);
