import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import { KineticObject, KineticSchema } from './kineticObject';
import type { PathInfo } from './levelObject';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelConfig } from '@/scenes/state';
import { Vec2Schema, numberSchema, rgbSchema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const MovingWallSchema = KineticSchema.extend({
  moveTo: Vec2Schema.default(new Vector2(0, 0)).meta({
    showInEditor: true,
    relativeTo: 'pos',
  }),
  speed: numberSchema.default(5),
  wallColor: rgbSchema.default('#388164'),
  wallOutlineColor: rgbSchema.default('#29694f'),
});

export class MovingWall extends KineticObject<typeof MovingWallSchema> {
  static override schema = MovingWallSchema;
  public moveFrom: Vector2 = new Vector2(0);
  public moveTo: Vector2 = new Vector2(0);

  public get speed(): number {
    return this.data.speed;
  }

  constructor(options: z.input<typeof MovingWallSchema>) {
    super(options);
  }

  override tick(): void {
    super.tick();

    if (this.moveTo.equals(this.moveFrom)) return;

    // if past moveTo, swap moveTo and moveFrom
    if (
      this.velocity.lenSq() > 0 &&
      this.moveTo.sub(this.pos).dot(this.velocity) <= 0
    ) {
      const temp = this.moveTo;
      this.moveTo = this.moveFrom;
      this.moveFrom = temp;
    }
    this.setVelocityTowards(this.moveTo, this.speed);
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

  override getState(): Record<string, unknown> {
    return {
      ...super.getState(),
      moveFrom: this.moveFrom,
      moveTo: this.moveTo,
    };
  }

  override loadState(state: Record<string, unknown>): void {
    super.loadState(state);
    this.moveFrom = state.moveFrom as Vector2;
    this.moveTo = state.moveTo as Vector2;
  }

  override sceneReset(scene: LevelScene): void {
    super.sceneReset(scene);
    this.moveFrom = this.data.position;
    this.moveTo = this.data.moveTo.add(this.data.position);
    this.velocity = this.moveTo.sub(this.pos).setLength(this.speed);
  }
}
registerLevelObject('movingWall', MovingWall);
