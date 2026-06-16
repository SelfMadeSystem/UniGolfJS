import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import type { PathInfo } from './levelObject';
import { PolyObject, PolyObjectSchema } from './polyObject';
import type { RigidBody } from './rigidBody';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import { Vec2Schema, positiveNumberSchema } from '@/utils/data';
import { rgbSchema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const SlopeSchema = PolyObjectSchema.extend({
  slopeColor: rgbSchema.default('#a67857'),
  slopeArrowColor: rgbSchema.default('#7c4a31'),
  slopeDirection: Vec2Schema.default(new Vector2(0, 1)),
  slopeForce: positiveNumberSchema.default(2.5),
});

const ARROW_UPSCALE = 10;

export class Slope extends PolyObject<typeof SlopeSchema> {
  static override schema = SlopeSchema;
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

    // Draw an arrow pointing in the direction of the slope
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
    this.arrowPatterns.set(key, pattern);
    return pattern;
  }

  constructor(options: z.input<typeof SlopeSchema>) {
    super(options);
  }

  override get isSolid(): boolean {
    return false;
  }

  override *render(info: RenderInfo): Iterable<RenderPass> {
    yield* this.polyRender(info);
    // Draw slope direction arrow
    yield pass(LAYERS.FLOOR_OBJECTS_3, ctx => {
      const path = this.getPath();
      const pattern = Slope.getArrowPattern(
        this.data.slopeDirection,
        this.data.slopeArrowColor,
      );
      ctx.save();
      ctx.clip(path);
      ctx.fillStyle = pattern;
      ctx.scale(1 / ARROW_UPSCALE, 1 / ARROW_UPSCALE);
      const aabb = this.getAABB().scale(ARROW_UPSCALE);
      ctx.fillRect(aabb.left, aabb.top, aabb.width, aabb.height);
      ctx.restore();
    });
  }

  override getPathInfo(): PathInfo {
    return {
      outlineLayer: -1,
      fillLayer: LAYERS.FLOOR_OBJECTS_1,
      outlineColor: '#00000000',
      fillColor: this.data.slopeColor,
      height: 0,
      outline: 0,
    };
  }

  override onIntersects(rigidBody: RigidBody): void {
    const dir = this.data.slopeDirection.setLength(this.data.slopeForce);
    rigidBody.velocity = rigidBody.velocity.add(dir);
  }

  override editorRotateShapeCCW(): void {
    super.editorRotateShapeCCW();
    this.set('slopeDirection', this.data.slopeDirection.cw90());
  }

  override editorRotateShapeCW(): void {
    super.editorRotateShapeCW();
    this.set('slopeDirection', this.data.slopeDirection.ccw90());
  }
}
registerLevelObject('slope', Slope);
