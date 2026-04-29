import type z from "zod";
import { Ball, BallSchema } from "./ball";
import { getLevelScene } from "@/scenes/state";
import { Tee } from "./tee";
import { Vector2 } from "@/utils/vec";

export const PlayerBallSchema = BallSchema;

export class PlayerBall extends Ball {
  static override schema = PlayerBallSchema;

  constructor(
    options: z.input<typeof PlayerBallSchema>,
    public tee: Tee,
  ) {
    super(options);
  }

  override tick(): void {
    super.tick();
    if (this.inWater) return;

    const scene = getLevelScene();
    if (!scene) return;

    const tees = scene.objects.filter(
      (obj): obj is Tee => obj instanceof Tee && obj !== this.tee,
    );

    if (!tees.length) return;

    for (const tee of tees) {
      if (!tee.isPointInside(this.pos)) continue;

      tee.active = true;
      this.tee.active = false;
      this.pos = tee.pos;
      this.velocity = new Vector2(0, 0);
      this.tee.ball = null;
      this.tee = tee;
      tee.ball = this;
      break;
    }
  }
}
