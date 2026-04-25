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
  WATER,
  WATER_WALL,
  OBJECTS_1,
  OBJECTS_2,
  OBJECTS_3,
  OBJECTS_4,
  TEE,
  HOLE,
  BALL,
  WALL_OUTLINE,
  WALL,
  INDICATORS,
  LIGHTS,
  DEBUG,
}
