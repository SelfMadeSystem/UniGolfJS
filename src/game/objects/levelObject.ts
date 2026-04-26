import type z from "zod";
import { GameObject, GameObjectSchema } from "./gameObject";
import { LAYERS, levelConfigSchema, type LevelConfig } from "../levelConfig";
import { type RenderPass, pass } from "@/render/drawable";
import { generatePathsFromPoints } from "@/utils/pathUtils";
import type { Vector2 } from "@/utils/vec";

export const LevelObjectSchema = GameObjectSchema.extend(levelConfigSchema.shape);

export type PathInfo = {
  shadowLayer?: number;
  outlineLayer: number;
  fillLayer: number;
  shadowColor: string;
  outlineColor: string;
  fillColor: string;
  height?: number;
  shadow?: number;
  outline: number;
};

export abstract class LevelObject<
  SchemaType extends typeof LevelObjectSchema = typeof LevelObjectSchema,
> extends GameObject<SchemaType> {
  static override schema = LevelObjectSchema;

  constructor(options: z.input<SchemaType>) {
    super(options);
  }

  renderPaths({
    shadowPath,
    outlinePath,
    fillPath,
    shadowLayer,
    outlineLayer,
    fillLayer,
    shadowColor,
    outlineColor,
    fillColor,
    shadow,
  }: {
    shadowPath?: Path2D;
    outlinePath: Path2D;
    fillPath: Path2D;
  } & PathInfo): Iterable<RenderPass> {
    return [
      ...((shadowPath &&
        shadow &&
        shadowLayer !== undefined && [
          pass(shadowLayer, (ctx) => {
            ctx.strokeStyle = shadowColor;
            ctx.lineWidth = shadow;
            ctx.lineJoin = "round";
            ctx.stroke(shadowPath);
          }),
        ]) ||
        []),
      pass(outlineLayer, (ctx) => {
        ctx.fillStyle = outlineColor;
        ctx.fill(outlinePath);
      }),
      pass(fillLayer, (ctx) => {
        ctx.fillStyle = fillColor;
        ctx.fill(fillPath);
      }),
    ];
  }

  renderPoints({
    points,
    shadowLayer,
    outlineLayer,
    fillLayer,
    shadowColor,
    outlineColor,
    fillColor,
    height,
    shadow,
    outline,
    debug = false,
  }: {
    points: Vector2[];
    debug?: boolean;
  } & PathInfo) {
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
        shadowLayer,
        outlineLayer,
        fillLayer,
        shadowColor,
        outlineColor,
        fillColor,
        height,
        shadow,
        outline,
      }),
      ...(debug
        ? [
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
          ]
        : []),
    ];
  }
}
