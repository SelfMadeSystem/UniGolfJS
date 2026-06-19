import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import { LevelObject, LevelObjectSchema } from './levelObject';
import { PlayerBall } from './playerBall';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import type { PointerInfo } from '@/render/pointerEvents';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelScene } from '@/scenes/state';
import { AABB } from '@/utils/aabb';
import {
  Vec2Schema,
  booleanSchema,
  numberSchema,
  objectIdSchema,
  positiveNumberSchema,
  rgbSchema,
} from '@/utils/data';
import { clamp } from '@/utils/mathUtils';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

const TeeSchema = LevelObjectSchema.extend({
  size: Vec2Schema.default(new Vector2(75, 50)).meta({
    showInEditor: true,
    relativeTo: 'pos',
    multiplier: 0.5,
  }),
  teeColor: rgbSchema.default('#f79d60'),
  radius: positiveNumberSchema.default(9),
  ballActive: booleanSchema.default(true),
  active: booleanSchema.default(false),
  maxDriverDistance: positiveNumberSchema.default(150),
  driverPowerMultiplier: positiveNumberSchema.default(0.3),
  cameraMinZoom: numberSchema.default(0),
  cameraMaxZoom: positiveNumberSchema.default(1),
  cameraTl: Vec2Schema.default(new Vector2(0, 0)).meta({
    showInEditor: true,
    relativeTo: 'pos',
  }),
  cameraBr: Vec2Schema.default(new Vector2(0, 0)).meta({
    showInEditor: true,
    relativeTo: 'pos',
  }),
  cameraPadding: positiveNumberSchema.default(50),
  activeTees: objectIdSchema.array().default([]),
});

export class Tee extends LevelObject<typeof TeeSchema> {
  static override schema = TeeSchema;
  public ball: PlayerBall | null = null;
  public driverPos: Vector2 | null = null;
  public shot = true;
  public doesntScale = true;

  public get size(): Vector2 {
    return this.data.size;
  }

  constructor(options: z.input<typeof TeeSchema>) {
    super(options);
  }

  override getAABB(): AABB {
    return AABB.fromCenterSize(this.pos, this.size);
  }

  override setAABB(aabb: AABB): void {
    this.set('size', aabb.size);
    this.set('position', aabb.center);
  }

  override getPath(): Path2D {
    const path = new Path2D();
    this.getAABB().pathRect(path);
    return path;
  }

  override isPointInside(point: Vector2): boolean {
    return this.getAABB().containsPoint(point);
  }

  onPointerDown() {
    const scene = getLevelScene();
    if (!scene) return;
    if (scene.activeTee !== this) return;
    if (!this.shot) return;

    scene.resetAllObjects();
    this.shot = false;
    const newBall = new PlayerBall(
      {
        position: this.pos,
        velocity: new Vector2(0, 0),
        radius: this.data.radius,
      },
      this,
      this.data.ballActive,
    );
    scene.addObject(newBall);
    this.ball = newBall;
  }

  onPointerMove(event: PointerInfo<PointerEvent>) {
    const scene = getLevelScene();
    if (!scene) return;
    if (this.shot || !event.leftButton) return;
    this.driverPos = scene.screenToWorld(event.pos);
  }

  onPointerUp() {
    if (this.driverPos && this.ball) {
      const velocity = this.ball.pos
        .sub(this.driverPos)
        .maxLength(this.data.maxDriverDistance)
        .mult(this.data.driverPowerMultiplier);
      if (this.ball) {
        this.shot = true;
        this.ball.velocity = velocity;
        this.ball.active = true;
      }
    }
    this.driverPos = null;
  }

  override *render(info: RenderInfo): Iterable<RenderPass> {
    yield pass(LAYERS.TEE, ctx => {
      const { teeColor } = this.data;
      ctx.fillStyle = teeColor;
      this.getAABB().fillRect(ctx);
    });

    const scene = getLevelScene();
    if (scene && scene.activeTee === this && !this.ball) {
      yield pass(LAYERS.TEE, ctx => {
        ctx.fillStyle = `rgba(0, 0, 0, ${Math.sin(info.tickWithInterp * 0.1) * 0.1 + 0.2})`;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.data.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    yield pass(LAYERS.INDICATORS, ctx => {
      if (!this.driverPos || !this.ball) return;
      ctx.strokeStyle = '#444';
      ctx.fillStyle = '#bbb';
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
        this.data.maxDriverDistance,
      );
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-arrowLength, 0);
      ctx.lineTo(-arrowLength + 10, -5);
      ctx.moveTo(-arrowLength, 0);
      ctx.lineTo(-arrowLength + 10, 5);
      ctx.stroke();

      ctx.restore();
    });
  }

  override reset(scene: LevelScene): void {
    super.reset(scene);
    if (this.ball) {
      this.ball.delete();
      this.ball = null;
    }
    this.driverPos = null;
    this.shot = true;
  }

  override sceneReset(scene: LevelScene): void {
    if (this.get('active')) {
      this.activate(scene);
      this.focusCamera(true, scene);
    }
    super.sceneReset(scene);
  }

  focusCamera(forceCamera = false, scene = getLevelScene()): void {
    if (!scene) return;
    const zoom = clamp(
      scene.getNecessaryZoom(
        this.data.cameraBr,
        this.data.cameraTl,
        this.data.cameraPadding,
      ),
      this.data.cameraMinZoom,
      this.data.cameraMaxZoom,
    );
    const center = this.data.cameraBr.avg(this.data.cameraTl).add(this.pos);
    if (forceCamera) {
      scene.snapCameraTo(center);
      scene.snapCameraZoomTo(zoom);
    } else {
      scene.moveCameraTo(center);
      scene.zoomCameraTo(zoom);
    }
  }

  activate(scene = getLevelScene()): void {
    if (!scene) return;
    scene.activeTee = this;
  }

  override editorScale(scale: Vector2): void {
    // no op for the tee
  }
}
registerLevelObject('tee', Tee);
