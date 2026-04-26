import type z from "zod";
import { GameObject, GameObjectSchema } from "./gameObject";
import { LAYERS, levelConfigSchema, type LevelConfig } from "../levelConfig";
import { type RenderPass, pass } from "@/render/drawable";
import { generatePathsFromPoints } from "@/utils/pathUtils";
import type { Vector2 } from "@/utils/vec";
import { AABB } from "@/utils/aabb";

export const LevelObjectSchema = GameObjectSchema.extend(
  levelConfigSchema.shape,
);

export type PathInfo = {
  shadowLayer?: number;
  outlineLayer: number;
  heightLayer: number;
  fillLayer: number;
  shadowColor?: string;
  outlineColor: string;
  fillColor: string;
  height: number;
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
  
  getAABB(): AABB {
    return new AABB(
      this.pos.sub(this.scale.mult(0.5)),
      this.pos.add(this.scale.mult(0.5)),
    );
  }

  abstract isPointInside(point: Vector2): boolean;

  renderPaths({
    shadowPath,
    heightPath,
    outlinePath,
    fillPath,
    shadowLayer,
    heightLayer,
    outlineLayer,
    fillLayer,
    shadowColor,
    outlineColor,
    fillColor,
    height,
    shadow,
  }: {
    shadowPath?: Path2D;
    heightPath: Path2D;
    outlinePath: Path2D;
    fillPath: Path2D;
  } & PathInfo): RenderPass[] {
    const passes = [
      pass(outlineLayer, (ctx) => {
        ctx.fillStyle = outlineColor;
        ctx.fill(outlinePath);
      }),
      pass(fillLayer, (ctx) => {
        ctx.fillStyle = fillColor;
        ctx.fill(fillPath);
      }),
    ];
    if (height > 0) {
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
    height,
    shadow,
    outline,
    debug = false,
  }: {
    points: Vector2[];
    debug?: boolean;
  } & PathInfo) {
    const { shadowPath, heightPath, outlinePath, fillPath } =
      generatePathsFromPoints(points, outline, height);

    const paths = this.renderPaths({
      shadowPath,
      heightPath,
      outlinePath,
      fillPath,
      shadowLayer,
      heightLayer,
      outlineLayer,
      fillLayer,
      shadowColor,
      outlineColor,
      fillColor,
      height,
      shadow,
      outline,
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
}
