import { LAYERS, WALL_CONFIG } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import type { PathInfo } from './levelObject';
import { PolyObject, PolyObjectSchema } from './polyObject';
import type { RigidBody } from './rigidBody';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import { blendColors } from '@/utils/colorUtils';
import { numberSchema, rgbSchema } from '@/utils/data';
import z from 'zod';

export const BouncyWallSchema = PolyObjectSchema.extend({
  bouncyWallColor: rgbSchema.default('#ff6b6b'),
  bouncyWallBoostColor: rgbSchema.default('#ff8787'),
  bouncyWallOutlineColor: rgbSchema.default('#cc5555'),
  speed: numberSchema.default(60),
});

// TODO: share w/ boost
const BOOST_EFFECT_TIME = 10;

export class BouncyWall extends PolyObject<typeof BouncyWallSchema> {
  static override schema = BouncyWallSchema;
  public boostTime: number = 0;

  constructor(options: z.input<typeof BouncyWallSchema>) {
    super(options);
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    return this.polyRender(info);
  }

  override tick(): void {
    super.tick();
    if (this.boostTime > 0) {
      this.boostTime--;
    }
  }

  override getPathInfo(info: RenderInfo): PathInfo {
    return {
      shadowLayer: LAYERS.WALL_SHADOW,
      heightLayer: LAYERS.WALL_HEIGHT,
      outlineLayer: LAYERS.WALL_OUTLINE,
      fillLayer: LAYERS.WALL_FILL,
      outlineColor: this.data.bouncyWallOutlineColor,
      fillColor: blendColors(
        this.data.bouncyWallColor,
        this.data.bouncyWallBoostColor,
        this.boostTime / BOOST_EFFECT_TIME,
      ),
      height: WALL_CONFIG.height,
      shadow: WALL_CONFIG.shadow,
      outline: WALL_CONFIG.outline,
      waterWallHeight: WALL_CONFIG.waterWallHeight - WALL_CONFIG.outline,
    };
  }

  override onCollision(rigidBody: RigidBody) {
    if (rigidBody.velocity.length() === 0) return;

    this.boostTime = BOOST_EFFECT_TIME;
    rigidBody.velocity = rigidBody.velocity.setLength(this.data.speed);
  }
}
registerLevelObject('bouncyWall', BouncyWall);
