import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { Vector2 } from "@/utils/vec";
import { LevelObject, LevelObjectSchema } from "./levelObject";
import z from "zod";
import { LAYERS } from "../levelConfig";
import { Ball } from "./ball";
import { getLevelScene } from "@/scenes/state";
import { AABB } from "@/utils/aabb";

const TeeSchema = LevelObjectSchema.extend({
  radius: z.number().positive().default(7.5),
});

const TEE_SIZE = new Vector2(60, 40);

const MAX_DRIVER_DISTANCE = 150;
const DRIVER_POWER_MULTIPLIER = 0.3;

export class Tee extends LevelObject<typeof TeeSchema> {
  static override schema = TeeSchema;
  public ball: Ball | null = null;
  public driverPos: Vector2 | null = null;
  public shot = true;

  constructor(options: z.input<typeof TeeSchema>) {
    super(options);
  }

  override getAABB(): AABB {
    return AABB.fromCenterSize(this.pos, TEE_SIZE);
  }

  override getPath(): Path2D {
    const path = new Path2D();
    this.getAABB().pathRect(path);
    return path;
  }

  override isPointInside(point: Vector2): boolean {
    return this.getAABB().containsPoint(point);
  }

  override tick(): void {
    const scene = getLevelScene();
    if (!scene) return;

    const pointers = scene.tickPointers;
    if (!pointers.length) return;

    for (const pointer of pointers) {
      switch (pointer.eventType) {
        case "pointerdown": {
          if (!this.shot) {
            break;
          }
          scene.resetAllObjects();
          this.shot = false;
          const newBall = new Ball({
            ...this.data,
            position: this.pos,
            velocity: new Vector2(0, 0),
            radius: this.data.radius,
          });
          scene.addObject(newBall);
          this.ball = newBall;
          break;
        }
        case "pointermove": {
          if (this.shot || !pointer.leftButton) return;
          this.driverPos = scene.getPointerPositionInWorld(pointer.pos);
          break;
        }
        case "pointerup": {
          if (this.driverPos && this.ball) {
            const velocity = this.ball.pos
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
        this.getAABB().fillRect(ctx);
      }),
      pass(LAYERS.INDICATORS, (ctx) => {
        if (!this.driverPos || !this.ball) return;
        ctx.strokeStyle = "#444";
        ctx.fillStyle = "#bbb";
        ctx.lineWidth = 1;
        ctx.save();
        ctx.translate(...this.driverPos.a);
        const angle = Math.atan2(
          this.driverPos.y - this.ball.pos.y,
          this.driverPos.x - this.ball.pos.x,
        );
        ctx.rotate(angle);

        // Driver indicator
        ctx.fillRect(-5, -20, 10, 40);
        ctx.strokeRect(-5, -20, 10, 40);

        ctx.restore();
        ctx.save();
        ctx.translate(...this.ball.pos.a);
        ctx.rotate(angle);

        // Arrow pointing in direction of the shot
        const arrowLength = Math.min(
          this.ball.pos.sub(this.driverPos).length(),
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

  override reset(): void {
    super.reset();
    if (this.ball) {
      this.ball.delete();
      this.ball = null;
    }
    this.driverPos = null;
    this.shot = true;
  }
}
