import { Ball, BallSchema } from './ball';
import { Tee } from './tee';
import { getLevelScene } from '@/scenes/state';
import { Vector2 } from '@/utils/vec';
import type z from 'zod';

export const PlayerBallSchema = BallSchema;

export class PlayerBall extends Ball {
  static override schema = PlayerBallSchema;

  constructor(
    options: z.input<typeof PlayerBallSchema>,
    public tee: Tee,
    public active: boolean,
  ) {
    super(options);
  }

  override tick(): void {
    if (this.active) super.tick();
    else this.prevPos = this.pos;
    if (this.inWater) return;

    const scene = getLevelScene();
    if (!scene) return;

    const tees = scene.objects.filter(
      (obj): obj is Tee => obj instanceof Tee && obj !== this.tee,
    );

    if (!tees.length) return;

    for (const tee of tees) {
      if (!tee.isPointInside(this.pos)) continue;

      this.setActiveTee(tee);
      break;
    }
  }

  setActiveTee(tee: Tee): void {
    this.pos = tee.pos;
    this.velocity = new Vector2(0, 0);
    this.tee.ball = null;
    this.tee = tee;
    tee.ball = this;
    tee.activate();
    tee.focusCamera();
  }

  override reset() {
    this.delete();
  }
}
