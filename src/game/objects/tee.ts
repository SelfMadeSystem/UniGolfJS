import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema } from "./levelObject";
import type z from "zod";
import { LAYERS } from "../levelConfig";
import { Vec2Schema } from "@/utils/data";
import { Ball } from "./ball";
import { $scene } from "@/scenes/state";
import { PlayScene } from "@/scenes/playScene";

const TeeSchema = LevelObjectSchema.extend({
  scale: Vec2Schema.default(new Vector2(40, 25)),
});

const MAX_DRIVER_DISTANCE = 150;
const DRIVER_POWER_MULTIPLIER = 0.2;

export class Tee extends LevelObject<typeof TeeSchema> {
  static override schema = TeeSchema;
  public ball: Ball | null = null;
  public driverPos: Vector2 | null = null;
  public shot = true;

  constructor(options: z.input<typeof TeeSchema>) {
    super(options);
  }

  override isPointInside(point: Vector2): boolean {
    return this.getAABB().containsPoint(point);
  }

  override tick(): void {
    const scene = $scene.get();
    if (!scene || !(scene instanceof PlayScene)) return;

    const pointers = scene.tickPointers;
    if (!pointers.length) return;

    for (const pointer of pointers) {
      switch (pointer.eventType) {
        case "pointerdown": {
          if (!this.shot) {
            break;
          }
          this.shot = false;
          if (this.ball) {
            this.ball.delete();
          }
          const newBall = new Ball({
            ...this.data,
            position: this.pos,
            velocity: new Vector2(0, 0),
            scale: new Vector2(15, 15),
          });
          scene.addObject(newBall);
          this.ball = newBall;
          scene.resetAllObjects();
          break;
        }
        case "pointermove": {
          if (pointer.leftButton) {
            this.driverPos = scene.getPointerPositionInWorld(pointer.pos);
          }
          break;
        }
        case "pointerup": {
          if (this.driverPos) {
            const velocity = this.pos
              .sub(this.driverPos)
              .maxLength(MAX_DRIVER_DISTANCE)
              .mult(DRIVER_POWER_MULTIPLIER);
            if (this.ball) {
              this.shot = true;
              this.ball.velocity = velocity;
            }
          }
          this.driverPos = null;
          break;
        }
      }
    }
  }

  override render(info: RenderInfo): Iterable<RenderPass> {
    return [
      pass(LAYERS.TEE, (ctx) => {
        const { teeColor } = this.data;
        ctx.fillStyle = teeColor;
        ctx.fillRect(
          this.pos.x - this.scale.x / 2,
          this.pos.y - this.scale.y / 2,
          this.scale.x,
          this.scale.y,
        );
      }),
      pass(LAYERS.INDICATORS, (ctx) => {
        if (!this.driverPos) return;
        ctx.strokeStyle = "#444";
        ctx.fillStyle = "#bbb";
        ctx.lineWidth = 1;
        ctx.save();
        ctx.translate(...this.driverPos.a);
        const angle = Math.atan2(
          this.driverPos.y - this.pos.y,
          this.driverPos.x - this.pos.x,
        );
        ctx.rotate(angle);

        // Driver indicator
        ctx.fillRect(-5, -20, 10, 40);
        ctx.strokeRect(-5, -20, 10, 40);

        ctx.restore();
        ctx.save();
        ctx.translate(...this.pos.a);
        ctx.rotate(angle);

        // Arrow pointing in direction of the shot
        const arrowLength = Math.min(
          this.pos.sub(this.driverPos).length(),
          MAX_DRIVER_DISTANCE,
        );
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-arrowLength, 0);
        ctx.lineTo(-arrowLength + 10, -5);
        ctx.moveTo(-arrowLength, 0);
        ctx.lineTo(-arrowLength + 10, 5);
        ctx.stroke();

        ctx.restore();
      }),
    ];
  }
}
