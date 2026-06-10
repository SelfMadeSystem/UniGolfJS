import { LAYERS, WALL_CONFIG } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import type { PathInfo } from './levelObject';
import { PolyObject, PolyObjectSchema } from './polyObject';
import type { RigidBody } from './rigidBody';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import { Vec2Schema, positiveNumberSchema, rgbSchema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const ConveyorBeltSchema = PolyObjectSchema.extend({
  conveyorColor: rgbSchema.default('#4a90e2'),
  conveyorArrowColor: rgbSchema.default('#357ABD'),
  conveyorDirection: Vec2Schema.default(new Vector2(1, 0)),
  conveyorSpeed: positiveNumberSchema.default(7.5),
  conveyorAccel: positiveNumberSchema.default(0.2),
});

const ARROW_UPSCALE = 10;

export class ConveyorBelt extends PolyObject<typeof ConveyorBeltSchema> {
  static override schema = ConveyorBeltSchema;
  static arrowPatterns: Map<string, CanvasPattern> = new Map();

  static getArrowPattern(direction: Vector2, color: string): CanvasPattern {
    const key = `${direction.toString()},${color}`;
    if (this.arrowPatterns.has(key)) {
      return this.arrowPatterns.get(key)!;
    }

    const size = 25 * ARROW_UPSCALE; // Base size of the arrow pattern
    // Create a temporary canvas to draw the arrow pattern
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = size;
    tempCanvas.height = size;
    const ctx = tempCanvas.getContext('2d')!;
    ctx.fillStyle = color;

    // Draw an arrow pointing in the direction of the conveyor
    const center = new Vector2(size / 2);
    const arrowAngle = direction.angle();

    ctx.beginPath();
    for (let i = 0; i < 3; i++) {
      const angle = arrowAngle + (i * 2 * Math.PI) / 3;
      const point = center.add(
        new Vector2(Math.cos(angle), Math.sin(angle)).mult(size / 4),
      );
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    }
    ctx.fill();

    const pattern = ctx.createPattern(tempCanvas, 'repeat')!;
    return pattern;
  }

  constructor(options: z.input<typeof ConveyorBeltSchema>) {
    super(options);
  }

  override get isSolid(): boolean {
    return false;
  }

  override getPathInfo(): PathInfo {
    return {
      outlineLayer: -1,
      fillLayer: LAYERS.OBJECTS_1,
      outlineColor: '#00000000',
      fillColor: this.data.conveyorColor,
      height: 0,
      shadow: WALL_CONFIG.shadow,
      outline: 0,
    };
  }

  override *render(info: RenderInfo): Iterable<RenderPass> {
    yield* this.polyRender(info);
    const { tickWithInterp } = info;

    // Draw animated directional arrows using pattern
    yield pass(LAYERS.OBJECTS_3, ctx => {
      const path = this.getPath();
      const direction = this.data.conveyorDirection.normalize();
      const pattern = ConveyorBelt.getArrowPattern(
        direction,
        this.data.conveyorArrowColor,
      );

      ctx.save();
      ctx.clip(path);

      // Apply animation offset by translating
      const arrowPatternSize = 25 * ARROW_UPSCALE;
      const offset =
        (tickWithInterp * this.data.conveyorSpeed * ARROW_UPSCALE) %
        arrowPatternSize;
      ctx.scale(1 / ARROW_UPSCALE, 1 / ARROW_UPSCALE);
      const aabb = this.getAABB().scale(ARROW_UPSCALE).expand(arrowPatternSize); // Expand AABB to ensure arrows cover the entire area
      ctx.translate(...direction.mult(offset).add(aabb.center).a);
      ctx.fillStyle = pattern;
      ctx.fillRect(-aabb.width / 2, -aabb.height / 2, aabb.width, aabb.height);

      ctx.restore();
    });
  }

  override onIntersects(rigidBody: RigidBody): void {
    const dir = this.data.conveyorDirection.normalize();
    const targetSpeed = this.data.conveyorSpeed;
    const accel = this.data.conveyorAccel * targetSpeed;

    const currentAlong = rigidBody.velocity.dot(dir);

    // Only speed up toward the belt's target speed.
    // Don't slow down balls that are already faster than the belt.
    const nextAlong =
      currentAlong < targetSpeed
        ? Math.min(currentAlong + accel, targetSpeed)
        : currentAlong;

    const parallel = dir.mult(currentAlong);
    const perpendicular = rigidBody.velocity.sub(parallel);

    rigidBody.velocity = perpendicular.add(dir.mult(nextAlong));
  }

  override editorRotateShapeCCW(): void {
    super.editorRotateShapeCCW();
    this.set('conveyorDirection', this.data.conveyorDirection.cw90());
  }

  override editorRotateShapeCW(): void {
    super.editorRotateShapeCW();
    this.set('conveyorDirection', this.data.conveyorDirection.ccw90());
  }
}
registerLevelObject('conveyorBelt', ConveyorBelt);
