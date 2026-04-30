import type z from "zod";
import { GameObject, GameObjectSchema } from "./gameObject";
import { LAYERS } from "../levelConfig";
import { type RenderPass, pass } from "@/render/drawable";
import { generatePathsFromPoints } from "@/utils/pathUtils";
import { Vector2 } from "@/utils/vec";
import { AABB } from "@/utils/aabb";
import { getLevelScene } from "@/scenes/state";

export const LevelObjectSchema = GameObjectSchema.extend({});

export type PathInfo = {
  shadowLayer?: number;
  outlineLayer: number;
  heightLayer?: number;
  fillLayer: number;
  shadowColor?: string;
  outlineColor: string;
  fillColor: string;
  waterWallColor?: string;
  height: number;
  shadow?: number;
  outline: number;
  waterWallHeight?: number;
};

export abstract class LevelObject<
  SchemaType extends typeof LevelObjectSchema = typeof LevelObjectSchema,
> extends GameObject<SchemaType> {
  static override schema = LevelObjectSchema;

  constructor(options: z.input<SchemaType>) {
    super(options);
  }

  abstract getAABB(): AABB;

  abstract getPath(): Path2D;

  abstract isPointInside(point: Vector2): boolean;

  renderPaths({
    shadowPath,
    heightPath,
    outlinePath,
    fillPath,
    waterWallPath,
    shadowLayer,
    heightLayer,
    outlineLayer,
    fillLayer,
    shadowColor,
    outlineColor,
    fillColor,
    waterWallColor,
    height,
    shadow,
  }: {
    shadowPath?: Path2D;
    heightPath: Path2D;
    outlinePath: Path2D;
    fillPath: Path2D;
    waterWallPath?: Path2D;
  } & PathInfo): RenderPass[] {
    const passes = [
      pass(outlineLayer, (ctx) => {
        ctx.fillStyle = outlineColor;
        ctx.fill(outlinePath);
      }),
      pass(fillLayer, (ctx) => {
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = fillColor;
        ctx.lineWidth = 0.25;
        ctx.fill(fillPath);
        ctx.stroke(fillPath);
      }),
    ];
    if (height > 0 && heightLayer !== undefined && outlineColor) {
      passes.push(
        pass(heightLayer, (ctx) => {
          ctx.fillStyle = outlineColor;
          ctx.fill(heightPath);
        }),
      );
    }
    if (shadowPath && shadow && shadowColor && shadowLayer !== undefined) {
      passes.push(
        pass(shadowLayer, (ctx) => {
          ctx.strokeStyle = shadowColor;
          ctx.lineWidth = shadow;
          ctx.lineJoin = "round";
          ctx.stroke(shadowPath);
        }),
      );
    }
    if (waterWallPath && waterWallColor) {
      passes.push(
        pass(LAYERS.WATER_WALL_FILL, (ctx) => {
          ctx.fillStyle = waterWallColor;
          ctx.fill(waterWallPath);
        }),
      );
    }
    return passes;
  }

  renderPoints({
    points,
    shadowLayer,
    outlineLayer,
    heightLayer,
    fillLayer,
    shadowColor,
    outlineColor,
    fillColor,
    waterWallColor,
    height,
    shadow,
    outline,
    waterWallHeight,
    debug = false,
  }: {
    points: Vector2[];
    debug?: boolean;
  } & PathInfo) {
    const { shadowPath, heightPath, outlinePath, fillPath, waterWallPath } =
      generatePathsFromPoints(points, outline, height, waterWallHeight ?? 0);

    const paths = this.renderPaths({
      shadowPath,
      heightPath,
      outlinePath,
      fillPath,
      waterWallPath,
      shadowLayer,
      heightLayer,
      outlineLayer,
      fillLayer,
      shadowColor,
      outlineColor,
      fillColor,
      waterWallColor,
      height,
      shadow,
      outline,
      waterWallHeight,
    });

    if (debug) {
      paths.push(
        pass(LAYERS.DEBUG, (ctx) => {
          ctx.strokeStyle = "#0f0";
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          for (let i = 0; i < points.length; i++) {
            const curr = points[i]!;
            const next = points[(i + 1) % points.length]!;
            ctx.moveTo(curr.x, curr.y);
            ctx.lineTo(next.x, next.y);
          }
          ctx.stroke();
        }),
      );
    }
    return paths;
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
    if (fromLevel) {
      scene.removeObjectFromLevel(this);
    } else {
      scene.removeObject(this);
    }
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
}
