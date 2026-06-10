import { LAYERS, WALL_CONFIG } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import type { PathInfo } from './levelObject';
import { PolyObject, PolyObjectSchema } from './polyObject';
import type { RigidBody } from './rigidBody';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import { numberSchema, rgbSchema } from '@/utils/data';
import z from 'zod';

export const WallSchema = PolyObjectSchema.extend({
  wallColor: rgbSchema.default('#388164'),
  wallOutlineColor: rgbSchema.default('#29694f'),
  boost: numberSchema.default(0),
});

export class BreakableWall extends PolyObject<typeof WallSchema> {
  static override schema = WallSchema;

  public broken = false;

  constructor(options: z.input<typeof WallSchema>) {
    super(options);
  }

  override get isSolid() {
    return !this.broken;
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: LAYERS.WALL_SHADOW,
      heightLayer: LAYERS.WALL_HEIGHT,
      outlineLayer: LAYERS.WALL_OUTLINE,
      fillLayer: LAYERS.WALL_FILL,
      outlineColor: this.data.wallOutlineColor,
      fillColor: this.data.wallColor,
      height: WALL_CONFIG.height,
      shadow: WALL_CONFIG.shadow,
      outline: -WALL_CONFIG.outline,
    };
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    if (this.broken) {
      return [];
    }
    return this.polyRender(info);
  }

  override onCollision(rigidBody: RigidBody) {
    this.broken = true;
    if (this.data.boost === 0 || rigidBody.velocity.lenSq() === 0) return;

    rigidBody.velocity = rigidBody.velocity.setLength(this.data.boost);
  }

  override reset(): void {
    super.reset();
    this.broken = false;
  }
}
registerLevelObject('breakableWall', BreakableWall);
