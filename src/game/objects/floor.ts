import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import type { PathInfo } from './levelObject';
import { PolyObject, PolyObjectSchema } from './polyObject';
import { BatchObjectRenderer } from '@/render/batchObjectRenderer';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import { rgbSchema } from '@/utils/data';
import z from 'zod';

export const FloorSchema = PolyObjectSchema.extend({
  floorColor: rgbSchema.default('#79b87b'),
});

export class Floor extends PolyObject<typeof FloorSchema> {
  static override schema = FloorSchema;
  static batchRenderer = new BatchObjectRenderer<Floor>(
    floor => floor.data.floorColor,
  );
  static draggingFloors: Set<Floor> = new Set();

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof FloorSchema>) {
    super(options);
    this.onAny(() => {
      if (this.dragging) return;
      Floor.batchRenderer.removeObject(this);
      Floor.batchRenderer.addObject(this);
    });
    Floor.batchRenderer.addObject(this);
  }

  override startDragging(): void {
    super.startDragging();
    Floor.batchRenderer.removeObject(this);
    Floor.draggingFloors.add(this);
  }

  override stopDragging(): void {
    super.stopDragging();
    Floor.batchRenderer.addObject(this);
    Floor.draggingFloors.delete(this);
  }

  override getPathInfo(): PathInfo {
    return {
      fillLayer: LAYERS.FLOOR,
      fillColor: this.data.floorColor,
    };
  }

  *renderDragging(info: RenderInfo): Iterable<RenderPass> {
    const points = this.getPoints();
    if (points.length < 3) return;

    const path = new Path2D();
    path.moveTo(points[0]!.x, points[0]!.y);
    for (let i = 1; i < points.length; i++) {
      path.lineTo(points[i]!.x, points[i]!.y);
    }
    path.closePath();

    yield pass(LAYERS.FLOOR, ctx => {
      ctx.fillStyle = this.data.floorColor;
      ctx.fill(path);
    });
  }

  override delete(fromLevel?: boolean): void {
    super.delete(fromLevel);
    Floor.batchRenderer.removeObject(this);
  }

  static override *staticRender(info: RenderInfo): Iterable<RenderPass> {
    for (const floor of Floor.draggingFloors) {
      yield* floor.renderDragging(info);
    }

    for (const [color, paths] of Floor.batchRenderer.getPaths(
      info.visibleArea,
    )) {
      yield pass(LAYERS.FLOOR, ctx => {
        ctx.fillStyle = color;
        for (const [path] of paths) {
          ctx.fill(path);
        }
      });
    }
  }
}
registerLevelObject('floor', Floor);
