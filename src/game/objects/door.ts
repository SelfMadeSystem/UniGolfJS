import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import { KineticObject, KineticSchema } from './kineticObject';
import type { PathInfo } from './levelObject';
import type { RigidBody } from './rigidBody';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelConfig } from '@/scenes/state';
import { Vec2Schema, numberSchema, rgbSchema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const DoorSchema = KineticSchema.extend({
  bounciness: numberSchema.default(1),
  moveTo: Vec2Schema.default(new Vector2(0, 0)).meta({
    showInEditor: true,
    relativeTo: 'pos',
  }),
  speed: numberSchema.default(5),
  wallColor: rgbSchema.default('#815b38'),
  wallOutlineColor: rgbSchema.default('#694829'),
});

export class Door extends KineticObject<typeof DoorSchema> {
  static override schema = DoorSchema;
  public moveFrom: Vector2 = new Vector2(0);
  public moveTo: Vector2 = new Vector2(0);
  public moving = false;

  public get speed(): number {
    return this.data.speed;
  }

  constructor(options: z.input<typeof DoorSchema>) {
    super(options);
  }

  override tick(): void {
    super.tick();

    if (!this.moving) return;

    if (this.moveTo.equals(this.moveFrom)) return;

    // if past moveTo, swap moveTo and moveFrom
    if (this.hasReached(this.moveTo)) {
      const temp = this.moveTo;
      this.moveTo = this.moveFrom;
      this.moveFrom = temp;
      this.moving = false;
      this.velocity = new Vector2(0, 0);
    } else this.setVelocityTowards(this.moveTo, this.speed);
  }

  override onCollision(rigidBody: RigidBody): void {
    if (!this.moving) this.moving = true;
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
      moving: this.moving,
      moveFrom: this.moveFrom,
      moveTo: this.moveTo,
    };
  }

  override loadState(state: Record<string, unknown>): void {
    super.loadState(state);
    this.moving = state.moving as boolean;
    this.moveFrom = state.moveFrom as Vector2;
    this.moveTo = state.moveTo as Vector2;
  }

  override sceneReset(scene: LevelScene): void {
    super.sceneReset(scene);
    this.moving = false;
    this.moveFrom = new Vector2(0, 0);
    this.moveTo = this.data.moveTo;
    this.velocity = new Vector2(0, 0);
  }
}
registerLevelObject('door', Door);
