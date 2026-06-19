import {
  deserializeLevelObject,
  serializeLevelObject,
  serializedLevelObject,
} from './levelObjectRegistry';
import { LevelObject } from './objects/levelObject';
import { positiveNumberSchema, stringSchema } from '@/utils/data';
import z from 'zod';

// TODO: put these in a more sensible place
export enum LAYERS {
  FLOOR,
  FLOOR_OBJECTS_1,
  FLOOR_OBJECTS_2,
  FLOOR_OBJECTS_3,
  WALL_SHADOW,
  WALL_SHADOW_DRAW,
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
  waterFillColor: stringSchema.default('#40A0FF'),
  waterWallColor: stringSchema.default('#779977'),
  shadowColor: stringSchema.default('#00000019'),
  outlineWidth: positiveNumberSchema.default(2),
  wallHeight: positiveNumberSchema.default(4),
  shadowWidth: positiveNumberSchema.default(4),
  waterWallHeight: positiveNumberSchema.default(8),
  dragCoefficient: positiveNumberSchema.default(0.99),
  frictionForce: positiveNumberSchema.default(0.35),
  constrainedDragMultiplier: positiveNumberSchema.default(0.9),
});
export const defaultLevelConfig = levelConfigSchema.parse({});
export type LevelConfig = z.infer<typeof levelConfigSchema>;

export type LevelState = Map<LevelObject<any>, Record<string, unknown>>;

export type Level = {
  stateStack: LevelState[];
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
    objects: level.objects.map(obj => serializeLevelObject(obj)),
    config: level.config,
  };
}

export function deserializeLevel(serialized: SerializedLevel): Level {
  return {
    stateStack: [],
    objects: serialized.objects.map(obj => deserializeLevelObject(obj)),
    config: serialized.config,
  };
}
