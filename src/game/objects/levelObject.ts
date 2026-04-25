import type z from "zod";
import { GameObject, GameObjectSchema } from "./gameObject";
import { LAYERS, type LevelConfig } from "../levelConfig";
import { type RenderPass, pass } from "@/render/drawable";
import { generatePathsFromPoints } from "@/utils/pathUtils";
import type { Vector2 } from "@/utils/vec";

export const LevelObjectSchema = GameObjectSchema.extend({
  // Nothing yet...
});

export abstract class LevelObject<
  SchemaType extends typeof LevelObjectSchema = typeof LevelObjectSchema,
> extends GameObject<SchemaType> {
  static override schema = LevelObjectSchema;
  protected levelConfig: LevelConfig;

  constructor(options: z.input<SchemaType>, levelConfig: LevelConfig) {
    super(options);
    this.levelConfig = levelConfig;
  }

  renderPaths({
    shadowPath,
    outlinePath,
    fillPath,
    shadowColor,
    outlineColor,
    fillColor,
    shadow,
  }: {
    shadowPath: Path2D;
    outlinePath: Path2D;
    fillPath: Path2D;
    shadowColor: string;
    outlineColor: string;
    fillColor: string;
    shadow: number;
  }): Iterable<RenderPass> {
    return [
      pass(LAYERS.WALL_SHADOW, (ctx) => {
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = shadow;
        ctx.lineJoin = "round";
        ctx.stroke(shadowPath);
      }),
      pass(LAYERS.WALL_OUTLINE, (ctx) => {
        ctx.fillStyle = outlineColor;
        ctx.fill(outlinePath);

        // ctx.strokeStyle = '#f00';
        // ctx.lineWidth = 0.5;
        // ctx.stroke(outlinePath);
      }),
      pass(LAYERS.WALL, (ctx) => {
        ctx.fillStyle = fillColor;
        ctx.fill(fillPath);
      }),
    ];
  }

  renderPoints({
    points,
    shadowColor,
    outlineColor,
    fillColor,
    height,
    shadow,
    outline,
  }: {
    points: Vector2[];
    shadowColor: string;
    outlineColor: string;
    fillColor: string;
    height: number;
    shadow: number;
    outline: number;
  }) {
    const { shadowPath, outlinePath, fillPath } = generatePathsFromPoints(
      points,
      outline,
      height,
    );

    return [
      ...this.renderPaths({
        shadowPath,
        outlinePath,
        fillPath,
        shadowColor,
        outlineColor,
        fillColor,
        shadow,
      }),
      // pass(LAYERS.DEBUG, (ctx) => {
      //   ctx.strokeStyle = "#0f0";
      //   ctx.lineWidth = 0.5;
      //   ctx.beginPath();
      //   for (let i = 0; i < points.length; i++) {
      //     const curr = points[i]!;
      //     const next = points[(i + 1) % points.length]!;
      //     ctx.moveTo(curr.x, curr.y);
      //     ctx.lineTo(next.x, next.y);
      //   }
      //   ctx.stroke();
      // }),
    ];
  }
}
