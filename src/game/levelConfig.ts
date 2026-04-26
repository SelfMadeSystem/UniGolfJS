import { rgbSchema } from "@/utils/data";
import z from "zod";

export const levelConfigSchema = z.object({
  wallColor: rgbSchema,
  wallOutlineColor: rgbSchema,
  wallShadowColor: rgbSchema,
  waterWallColor: rgbSchema,
  floorColor: rgbSchema,
  floorAccentColor: rgbSchema,
  teeColor: rgbSchema,
});
export type LevelConfig = z.infer<typeof levelConfigSchema>;

// Globals
export const WALL_CONFIG = {
  outline: 2,
  shadow: 4,
  height: 4,
  waterWallHeight: 8,
} as const;

export enum LAYERS {
  FLOOR,
  WALL_SHADOW,
  WATER_FILL,
  WATER_WALL_PRE,
  WATER_WALL_CLIP_REGIONS,
  WATER_WALL_CLIP,
  WATER_WALL_FILL,
  WATER_WALL_POST,
  WALL_HEIGHT,
  OBJECTS_1,
  OBJECTS_2,
  OBJECTS_3,
  OBJECTS_4,
  TEE,
  HOLE_OUTLINE,
  HOLE_FILL,
  BALL,
  WALL_OUTLINE,
  WALL_FILL,
  INDICATORS,
  LIGHTS,
  DEBUG,
}
