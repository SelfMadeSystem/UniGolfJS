import { rgbSchema } from "@/utils/data";
import z from "zod";

export const levelConfigSchema = z.object({
  wallColor: rgbSchema,
  wallOutlineColor: rgbSchema,
  wallShadowColor: rgbSchema,
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
} as const;

export enum LAYERS {
  FLOOR,
  WALL_SHADOW,
  WATER_OUTLINE,
  WATER_FILL,
  WATER_WALL,
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
