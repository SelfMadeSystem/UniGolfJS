import { PolyObject, PolyObjectSchema, SHAPE_POINTS } from './polyObject';
import type { RenderInfo, RenderPass } from '@/render/drawable';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelScene } from '@/scenes/state';
import { numberSchema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const KineticSchema = PolyObjectSchema.extend({
  bounciness: numberSchema.default(0.5),
});

export abstract class KineticObject<
  SchemaType extends typeof KineticSchema = typeof KineticSchema,
> extends PolyObject<SchemaType> {
  static override schema = KineticSchema;

  public prevPos: Vector2;
  public renderPos: Vector2;
  private _velocity: Vector2 = new Vector2(0, 0);
  public get velocity(): Vector2 {
    return this._velocity;
  }
  public set velocity(value: Vector2) {
    if (this._velocity.equals(value)) return;
    this._velocity = value;
    this.emitAabbChange();
  }
  public velocityAccum: Vector2 = new Vector2(0);
  public startTickPos: Vector2 = new Vector2(0);
  protected _posDelta: Vector2 = new Vector2(0, 0);

  public get posDelta(): Vector2 {
    return this._posDelta;
  }

  public set posDelta(value: Vector2) {
    if (this._posDelta.equals(value)) return;
    this._posDelta = value;
    this.emitAabbChange();
  }

  public override get pos(): Vector2 {
    return this.data.position.add(this.posDelta);
  }
  public override set pos(value: Vector2) {
    console.warn("Shouldn't set pos...");
    this.posDelta = value.sub(this.data.position);
  }

  constructor(options: z.input<SchemaType>) {
    super(options);
    this.prevPos = this.pos;
    this.renderPos = this.pos;
  }

  /**
   * @argument target The target position in relative space
   */
  public hasReached(target: Vector2) {
    return (
      target.distSq(this._posDelta) === 0 ||
      (this.velocity.lenSq() > 0 &&
        target.sub(this._posDelta).dot(this.velocity) <= 0)
    );
  }

  /**
   * @argument target The target position in relative space
   */
  public setVelocityTowards(target: Vector2, speed: number) {
    target = target.sub(this._posDelta);
    if (target.lenSq() < speed * speed) {
      this.velocity = target;
    } else {
      this.velocity = target.setLength(speed);
    }
  }

  override tick(): void {
    super.tick();
    this.prevPos = this.pos;
  }

  override getRenderPolygons(): Vector2[][] {
    return this.getBasePolygons().map(p => p.map(v => v.add(this.renderPos)));
  }

  override polyRender(info: RenderInfo): Iterable<RenderPass> {
    const scene = getLevelScene();
    this.renderPos = this.prevPos.lerp(
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
    this.prevPos = this.data.position;
  }

  override getState(): Record<string, unknown> {
    return {
      posDelta: this.posDelta,
      velocity: this.velocity,
      prevPos: this.prevPos,
    };
  }

  override loadState(state: Record<string, unknown>): void {
    this.posDelta = state.posDelta as Vector2;
    this.velocity = state.velocity as Vector2;
    this.prevPos = state.prevPos as Vector2;
  }
}
