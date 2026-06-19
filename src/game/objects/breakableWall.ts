import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import type { PathInfo } from './levelObject';
import { PolyObject, PolyObjectSchema } from './polyObject';
import type { RigidBody } from './rigidBody';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelConfig } from '@/scenes/state';
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
  public savedBroken = false;

  constructor(options: z.input<typeof WallSchema>) {
    super(options);
  }

  override get isSolid() {
    return !this.broken;
  }

  override getPathInfo(): PathInfo {
    const { wallHeight, outlineWidth } = getLevelConfig();
    return {
      heightLayer: LAYERS.WALL_HEIGHT,
      outlineLayer: LAYERS.WALL_OUTLINE,
      fillLayer: LAYERS.WALL_FILL,
      outlineColor: this.data.wallOutlineColor,
      fillColor: this.data.wallColor,
      height: wallHeight,
      shadow: true,
      outline: -outlineWidth,
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

  override saveState(): void {
    super.saveState();
    this.savedBroken = this.broken;
  }

  override reset(scene: LevelScene): void {
    super.reset(scene);
    this.broken = this.savedBroken;
  }

  override sceneReset(scene: LevelScene): void {
    this.broken = false;
    super.sceneReset(scene);
  }
}
registerLevelObject('breakableWall', BreakableWall);
