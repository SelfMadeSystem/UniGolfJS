import z from "zod";
import type { LevelObject } from "./objects/levelObject";

export const levelObjectRegistry: Map<string, typeof LevelObject<any>> =
  new Map();
export const objectIdsByClass: Map<typeof LevelObject<any>, string> = new Map();
export const objectClasses: Set<typeof LevelObject<any>> = new Set();

export const serializedLevelObject = z.object({
  id: z.string(),
  props: z.record(z.string(), z.unknown()),
});
export type SerializedLevelObject = z.infer<typeof serializedLevelObject>;

export function registerLevelObject(
  id: string,
  clazz: typeof LevelObject<any>,
): void {
  if (levelObjectRegistry.has(id)) {
    throw new Error(`Duplicate level object id: ${id}`);
  }
  levelObjectRegistry.set(id, clazz);
  objectIdsByClass.set(clazz, id);
  objectClasses.add(clazz);
}

export function getLevelObjectClass(
  id: string,
): typeof LevelObject<any> | null {
  return levelObjectRegistry.get(id) ?? null;
}

export function getLevelObjectId(
  clazz: typeof LevelObject<any>,
): string | null {
  return objectIdsByClass.get(clazz) ?? null;
}

export function createLevelObject(
  id: string,
  props: Record<string, unknown>,
): LevelObject<any> {
  const clazz = getLevelObjectClass(id);
  if (!clazz) {
    throw new Error(`Unknown level object id: ${id}`);
  }
  // @ts-expect-error can't be arsed to type this properly. it's never an abstract class, so it will always be constructable
  return new clazz(props);
}

export function serializeLevelObject(
  object: LevelObject<any>,
): SerializedLevelObject {
  return {
    id: getLevelObjectId(object.constructor as typeof LevelObject<any>)!,
    props: object.serialize(),
  };
}

export function deserializeLevelObject(
  serialized: SerializedLevelObject,
): LevelObject<any> {
  const clazz = getLevelObjectClass(serialized.id);
  if (!clazz) {
    throw new Error(`Unknown level object id: ${serialized.id}`);
  }
  // @ts-expect-error can't be arsed to type this properly. it's never an abstract class, so it will always be constructable
  return new clazz(clazz.schema.decode(serialized.props));
}
