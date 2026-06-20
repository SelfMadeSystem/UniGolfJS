import { PolyObject, PolyObjectSchema, SHAPE_POINTS } from './polyObject';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelScene } from '@/scenes/state';
import { Vec2Schema, numberSchema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const KineticSchema = PolyObjectSchema.extend({
  bounciness: numberSchema.default(0.5),
  velocity: Vec2Schema.default(new Vector2(0, 0)).meta({
    showInEditor: true,
    relativeTo: 'pos',
    multiplier: 10,
  }),
});

export abstract class KineticObject<
  SchemaType extends typeof KineticSchema = typeof KineticSchema,
> extends PolyObject<SchemaType> {
  static override schema = KineticSchema;

  public prevPos: Vector2;
  public partialPos: Vector2;
  public velocity: Vector2;

  constructor(options: z.input<SchemaType>) {
    super(options);
    this.velocity = this.data.velocity;
    this.prevPos = this.pos;
    this.partialPos = this.pos;
  }

  override tick(): void {
    super.tick();
    this.prevPos = this.pos;
  }

  getBasePoints(): Vector2[] {
    return super.getPoints();
  }

  override getPoints(): Vector2[] {
    const { shape, rotation } = this.data;
    const basePoints = SHAPE_POINTS[shape];
    return basePoints.map(p =>
      p.rot90(rotation).mult(this.scale).add(this.partialPos),
    );
  }

  override polyRender(info: RenderInfo): Iterable<RenderPass> {
    const scene = getLevelScene();
    this.partialPos = this.prevPos.lerp(
      this.pos,
      scene?.playing ? info.tickInterp : 1,
    );
    return super.polyRender(info);
  }

  getBaseAABB() {
    return super.getAABB();
  }

  getMovementAABB() {
    return super.getAABB().expandVec(this.velocity);
  }

  override sceneReset(scene: LevelScene): void {
    super.sceneReset(scene);
    this.velocity = this.data.velocity;
    this.prevPos = this.data.position;
  }

  override getState(): Record<string, unknown> {
    return {
      ...super.getState(),
      velocity: this.velocity,
      prevPos: this.prevPos,
    };
  }

  override loadState(state: Record<string, unknown>): void {
    super.loadState(state);
    this.velocity = state.velocity as Vector2;
    this.prevPos = state.prevPos as Vector2;
  }
}
