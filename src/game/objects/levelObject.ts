import { LAYERS } from '../levelConfig';
import {
  deserializeLevelObject,
  serializeLevelObject,
} from '../levelObjectRegistry';
import { GameObject, GameObjectSchema } from './gameObject';
import { type RenderPass, pass } from '@/render/drawable';
import type { LevelScene } from '@/scenes/levelScene';
import { getLevelConfig, getLevelScene } from '@/scenes/state';
import { AABB } from '@/utils/aabb';
import { generatePathsFromPoints } from '@/utils/pathUtils';
import { Vector2 } from '@/utils/vec';
import { nanoid } from 'nanoid';
import type z from 'zod';

export const LevelObjectSchema = GameObjectSchema.extend({});

export type PathInfo = {
  shadowLayer?: number;
  outlineLayer?: number;
  heightLayer?: number;
  fillLayer: number;
  outlineColor?: string;
  fillColor: string;
  height?: number;
  shadow?: number;
  outline?: number;
  waterWallHeight?: number;
};

export abstract class LevelObject<
  SchemaType extends typeof LevelObjectSchema = typeof LevelObjectSchema,
> extends GameObject<SchemaType> {
  static override schema = LevelObjectSchema;
  protected dragging: boolean = false;
  protected aabbListeners: Set<() => void> = new Set();
  public deleted = false;

  public override get pos(): Vector2 {
    return this._pos;
  }

  public override set pos(value: Vector2) {
    if (this._pos.equals(value)) return;
    this._pos = value;
    this.emitAabbChange();
  }

  constructor(options: z.input<SchemaType>) {
    super(options);
    this.on('position', () => {
      this.emitAabbChange();
    });
  }

  onAabbChange(listener: () => void): () => void {
    this.aabbListeners.add(listener);
    return () => {
      this.aabbListeners.delete(listener);
    };
  }

  protected emitAabbChange(): void {
    for (const listener of this.aabbListeners) {
      listener();
    }
  }

  startDragging() {
    this.dragging = true;
  }

  stopDragging() {
    this.dragging = false;
  }

  abstract getAABB(): AABB;

  abstract getPath(): Path2D;

  abstract isPointInside(point: Vector2): boolean;

  static *renderPaths({
    shadowPath,
    heightPath,
    outlinePath,
    fillPath,
    waterWallPath,
    shadowLayer,
    heightLayer,
    outlineLayer,
    fillLayer,
    outlineColor,
    fillColor,
    height,
    shadow,
  }: {
    shadowPath?: Path2D;
    heightPath: Path2D;
    outlinePath: Path2D;
    fillPath: Path2D;
    waterWallPath?: Path2D;
  } & PathInfo): Iterable<RenderPass> {
    if (outlineLayer !== undefined && outlineColor)
      yield pass(outlineLayer, ctx => {
        ctx.fillStyle = outlineColor;
        ctx.fill(outlinePath);
      });
    yield pass(fillLayer, ctx => {
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = fillColor;
      ctx.lineWidth = 0.25;
      ctx.fill(fillPath);
      ctx.stroke(fillPath);
    });
    if (
      height !== undefined &&
      height > 0 &&
      heightLayer !== undefined &&
      outlineColor
    ) {
      yield pass(heightLayer, ctx => {
        ctx.fillStyle = outlineColor;
        ctx.fill(heightPath);
      });
    }
    if (shadowPath && shadow && shadowLayer !== undefined) {
      yield pass(shadowLayer, ctx => {
        const shadowColor = getLevelConfig().shadowColor;
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = shadow;
        ctx.lineJoin = 'round';
        ctx.stroke(shadowPath);
      });
    }
    if (waterWallPath) {
      yield pass(LAYERS.WATER_WALL_FILL, ctx => {
        ctx.fillStyle = getLevelConfig().waterWallColor;
        ctx.fill(waterWallPath);
      });
    }
  }

  static *renderPoints({
    points,
    shadowLayer,
    outlineLayer,
    heightLayer,
    fillLayer,
    outlineColor,
    fillColor,
    height,
    shadow,
    outline,
    waterWallHeight,
    debug = false,
  }: {
    points: Vector2[];
    debug?: boolean;
  } & PathInfo): Iterable<RenderPass> {
    const { shadowPath, heightPath, outlinePath, fillPath, waterWallPath } =
      generatePathsFromPoints(
        points,
        outline ?? 0,
        height ?? 0,
        waterWallHeight ?? 0,
      );

    yield* this.renderPaths({
      shadowPath,
      heightPath,
      outlinePath,
      fillPath,
      waterWallPath,
      shadowLayer,
      heightLayer,
      outlineLayer,
      fillLayer,
      outlineColor,
      fillColor,
      height,
      shadow,
      outline,
      waterWallHeight,
    });

    if (debug) {
      yield pass(LAYERS.DEBUG, ctx => {
        ctx.strokeStyle = '#0f0';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < points.length; i++) {
          const curr = points[i]!;
          const next = points[(i + 1) % points.length]!;
          ctx.moveTo(curr.x, curr.y);
          ctx.lineTo(next.x, next.y);
        }
        ctx.stroke();
      });
    }
  }

  /**
   * Snaps the top-left corner of the object's AABB to the grid.
   */
  editorSnapToGrid(gridSize: number): void {
    const aabb = this.getAABB();
    const snappedTL = new Vector2(
      Math.round(aabb.tl.x / gridSize) * gridSize,
      Math.round(aabb.tl.y / gridSize) * gridSize,
    );
    const delta = snappedTL.sub(aabb.tl);
    this.pos = this.pos.add(delta);
  }

  /**
   * Scales the object relative to its center by the given scale factor.
   */
  abstract editorScale(scale: Vector2): void;

  override delete(fromLevel = false): void {
    const scene = getLevelScene();
    if (!scene) return;
    this.deleted = true;
    this.aabbListeners.clear();
    this.listeners.clear();
    this.anyListeners.clear();
    if (fromLevel) {
      scene.removeObjectFromLevel(this);
    } else {
      scene.removeObject(this);
    }
  }

  /**
   * Duplicates the object, giving it a new ID. The duplicate is not added to any scene or level by default.
   */
  duplicate(): LevelObject {
    const newObj = deserializeLevelObject(serializeLevelObject(this));
    newObj.data.id = nanoid();
    return newObj;
  }

  /**
   * Rotates the object around its center clockwise by 90 degrees.
   */
  editorRotateCW(): void {}
  /**
   * Rotates the object around its center counterclockwise by 90 degrees.
   */
  editorRotateCCW(): void {}

  /**
   * Rotates the object's shape counterclockwise by 90 degrees. The object's AABB should be the same after this operation.
   */
  editorRotateShapeCCW(): void {}

  /**
   * Rotates the object's shape clockwise by 90 degrees. The object's AABB should be the same after this operation.
   */
  editorRotateShapeCW(): void {}

  override reset(sceneReset?: boolean, scene?: LevelScene): void {
    super.reset(sceneReset, scene);
    this.emitAabbChange();
  }
}
