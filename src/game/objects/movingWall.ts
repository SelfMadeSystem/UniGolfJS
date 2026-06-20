import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import { KineticObject, KineticSchema } from './kineticObject';
import type { PathInfo } from './levelObject';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import { getLevelConfig } from '@/scenes/state';
import { rgbSchema } from '@/utils/data';
import z from 'zod';

export const MovingWallSchema = KineticSchema.extend({
  wallColor: rgbSchema.default('#388164'),
  wallOutlineColor: rgbSchema.default('#29694f'),
});

export class MovingWall extends KineticObject<typeof MovingWallSchema> {
  static override schema = MovingWallSchema;

  constructor(options: z.input<typeof MovingWallSchema>) {
    super(options);
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    return this.polyRender(info);
  }

  override getPathInfo(): PathInfo {
    const { wallHeight, outlineWidth, waterWallHeight } = getLevelConfig();
    return {
      heightLayer: LAYERS.WALL_HEIGHT,
      outlineLayer: LAYERS.WALL_OUTLINE,
      fillLayer: LAYERS.WALL_FILL,
      outlineColor: this.data.wallOutlineColor,
      fillColor: this.data.wallColor,
      height: wallHeight,
      shadow: true,
      outline: outlineWidth,
      waterWallHeight: waterWallHeight - outlineWidth,
    };
  }
}
registerLevelObject('movingWall', MovingWall);
