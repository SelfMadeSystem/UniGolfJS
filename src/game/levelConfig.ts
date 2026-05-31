import z from "zod";
import { deserializeLevelObject, serializedLevelObject, serializeLevelObject } from "./levelObjectRegistry";
import { LevelObject } from "./objects/levelObject";

// TODO: put these in a more sensible place
export const WALL_CONFIG = {
  outline: 2,
  shadow: 4,
  height: 4,
  waterWallHeight: 8,
} as const;

// TODO: put these in a more sensible place
export enum LAYERS {
  FLOOR,
  WALL_SHADOW,
  WATER_WALL_PRE,
  WATER_WALL_CLIP_REGIONS,
  WATER_WALL_CLIP,
  WATER_FILL,
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
  EDITOR,
  DEBUG,
}

export const levelConfigSchema = z.object({
  waterFillColor: z.string().default("#40A0FF"),
  waterWallColor: z.string().default("#779977"),
  shadowColor: z.string().default("#76b97e"),
});
export const defaultLevelConfig = levelConfigSchema.parse({});
export type LevelConfig = z.infer<typeof levelConfigSchema>;

export type Level = {
  objects: LevelObject<any>[];
  config: LevelConfig;
};

export const serializedLevelSchema = z.object({
  objects: z.array(serializedLevelObject),
  config: levelConfigSchema,
});
export type SerializedLevel = z.infer<typeof serializedLevelSchema>;

export function serializeLevel(level: Level): SerializedLevel {
  return {
    objects: level.objects.map((obj) => serializeLevelObject(obj)),
    config: level.config,
  };
}

export function deserializeLevel(serialized: SerializedLevel): Level {
  return {
    objects: serialized.objects.map((obj) => deserializeLevelObject(obj)),
    config: serialized.config,
  };
}
