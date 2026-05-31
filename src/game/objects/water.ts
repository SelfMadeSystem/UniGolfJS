import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import { PolyObject, PolyObjectSchema } from "./polyObject";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { getLevelConfig } from "@/scenes/state";
import { registerLevelObject } from "../levelObjectRegistry";
import { BatchObjectRenderer } from "@/render/batchObjectRenderer";
import { generatePathsFromPoints } from "@/utils/pathUtils";

export const WaterSchema = PolyObjectSchema.extend({});

export class Water extends PolyObject<typeof WaterSchema> {
  static override schema = WaterSchema;
  static batchRenderer = new BatchObjectRenderer<Water>();
  static draggingWaters: Set<Water> = new Set();

  override get isSolid(): boolean {
    return false;
  }

  constructor(options: z.input<typeof WaterSchema>) {
    super(options);
    this.onAny(() => {
      if (this.dragging) return;
      Water.batchRenderer.removeObject(this);
      Water.batchRenderer.addObject(this);
    });
    Water.batchRenderer.addObject(this);
  }

  override startDragging(): void {
    super.startDragging();
    Water.batchRenderer.removeObject(this);
    Water.draggingWaters.add(this);
  }

  override stopDragging(): void {
    super.stopDragging();
    Water.batchRenderer.addObject(this);
    Water.draggingWaters.delete(this);
  }

  override delete(fromLevel?: boolean): void {
    super.delete(fromLevel);
    Water.batchRenderer.removeObject(this);
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: LAYERS.WALL_SHADOW,
      heightLayer: 0,
      outlineLayer: 0,
      fillLayer: LAYERS.WATER_FILL,
      outlineColor: "transparent",
      fillColor: "transparent",
      height: 0,
      outline: 0,
      shadow: WALL_CONFIG.shadow,
    };
  }

  override intersectsRigidBody(rigidBody: RigidBody): boolean {
    return this.isPointInside(rigidBody.pos);
  }

  override onIntersects(rigidBody: RigidBody): void {
    rigidBody.inWater = true;
  }

  static override *staticRender(info: RenderInfo): Iterable<RenderPass> {
    const clipPath = new Path2D();
    for (const water of this.draggingWaters) {
      const path = water.getPath();
      yield pass(LAYERS.WATER_FILL, (ctx) => {
        ctx.fillStyle = waterFillColor;
        ctx.fill(path);
      });
      yield pass(LAYERS.WALL_SHADOW, (ctx) => {
        ctx.strokeStyle = shadowColor;
        ctx.lineWidth = WALL_CONFIG.shadow;
        ctx.lineJoin = "round";
        ctx.stroke(path);
      });
      clipPath.addPath(path);
    }
    yield pass(LAYERS.WATER_WALL_PRE, (ctx) => {
      ctx.save();
    });
    // water will add to the clipPath in WATER_WALL_CLIP_REGIONS
    const { waterFillColor, waterWallColor, shadowColor } = getLevelConfig();
    const pathsIter = Water.batchRenderer.getPaths(info.visibleArea);
    for (const [, paths] of pathsIter) {
      for (const [path, points] of paths) {
        yield pass(LAYERS.WATER_FILL, (ctx) => {
          ctx.fillStyle = waterFillColor;
          ctx.fill(path);
        });
        yield pass(LAYERS.WALL_SHADOW, (ctx) => {
          ctx.strokeStyle = shadowColor;
          ctx.lineWidth = WALL_CONFIG.shadow;
          ctx.lineJoin = "round";
          ctx.stroke(path);
        });
        clipPath.addPath(path);
        for (const pts of points) {
          const gened = generatePathsFromPoints(
            pts,
            0,
            0,
            WALL_CONFIG.waterWallHeight,
          );
          yield pass(LAYERS.WATER_WALL_FILL, (ctx) => {
            ctx.fillStyle = waterWallColor;
            ctx.fill(gened.waterWallPath);
          });
        }
      }
    }
    yield pass(LAYERS.WATER_WALL_CLIP, (ctx) => {
      ctx.clip(clipPath);
    });
    // yield pass(LAYERS.WATER_FILL, (ctx) => {
    //   ctx.save();
    //   ctx.translate(0, WALL_CONFIG.waterWallHeight);
    //   ctx.fillStyle = getLevelConfig().waterWallColor;
    //   ctx.fill(this.clipPath);
    //   ctx.restore();
    // });
    // // walls will render their "water walls" in WATER_WALL_FILL
    yield pass(LAYERS.WATER_WALL_POST, (ctx) => {
      ctx.restore();
    });
  }
}
registerLevelObject("water", Water);
