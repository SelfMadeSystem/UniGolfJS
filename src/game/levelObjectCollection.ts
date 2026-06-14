import type { LevelObject } from './objects/levelObject';
import type { Drawable } from '@/render/drawable';
import type { AABB } from '@/utils/aabb';
import { LevelObjectRBush } from '@/utils/spatialUtils';
import type { BBox } from 'rbush';

/**
 * Central ownership for game objects.
 *
 * The backing structure stays simple for now: a stable ordered list plus an ID
 * index for direct lookup. Objects are also indexed by their class and superclasses
 * for efficient type-based queries.
 */
type T = LevelObject<any>;
type tT = typeof LevelObject<any>;
export class LevelObjectCollection implements Iterable<T> {
  private readonly items: T[] = [];
  private readonly byId = new Map<string, T>();
  private readonly byType = new Map<tT, Set<T>>();
  private readonly spatialGrid = new LevelObjectRBush<T>();
  private readonly renderSpatialGrid = new LevelObjectRBush<T>();

  constructor(objects: Iterable<T> = []) {
    this.replace(objects);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  get size(): number {
    return this.items.length;
  }

  drawableObjects(aabb: AABB): Iterable<T> {
    return this.renderSpatialGrid.search(aabb);
  }

  drawableStatic(): Iterable<Drawable> {
    return this.byType
      .keys()
      .filter(type => type.hasStaticRender())
      .map(type => type.staticDrawable());
  }

  addType(type: tT): void {
    if (!this.byType.has(type)) {
      this.byType.set(type, new Set());
    }
  }

  add(object: T, batch = false): void {
    if (this.byId.has(object.id)) {
      throw new Error(`Duplicate game object id: ${object.id}`);
    }

    object.onAabbChange(() => {
      this.spatialGrid.update(object);
      if (object.hasRender()) {
        this.renderSpatialGrid.update(object);
      }
    });
    this.items.push(object);
    this.byId.set(object.id, object);
    this.registerByType(object);
    if (batch) return;
    this.spatialGrid.insert(object);
    if (object.hasRender()) {
      this.renderSpatialGrid.insert(object);
    }
  }

  prepend(object: T): void {
    if (this.byId.has(object.id)) {
      throw new Error(`Duplicate game object id: ${object.id}`);
    }

    this.items.unshift(object);
    this.byId.set(object.id, object);
    this.spatialGrid.insert(object);
    if (object.hasRender()) {
      this.renderSpatialGrid.insert(object);
    }
    this.registerByType(object);
  }

  remove(object: T): boolean {
    const index = this.items.indexOf(object);
    if (index === -1) {
      console.warn('Object not found:', object);
      return false;
    }

    this.items.splice(index, 1);
    this.byId.delete(object.id);
    this.spatialGrid.remove(object);
    this.renderSpatialGrid.remove(object);
    this.unregisterByType(object);
    return true;
  }

  getById(id: string): T | null {
    return this.byId.get(id) ?? null;
  }

  replace(objects: Iterable<T>): void {
    this.clear();
    for (const object of objects) {
      this.add(object, true);
    }
    this.spatialGrid.load([...objects]);
    this.renderSpatialGrid.load([...objects].filter(obj => obj.hasRender()));
  }

  queryByBBox(aabb: BBox): Iterable<T> {
    return this.spatialGrid.search(aabb);
  }

  clear(): void {
    this.items.length = 0;
    this.byId.clear();
    this.byType.clear();
    this.spatialGrid.clear();
    this.renderSpatialGrid.clear();
  }

  toArray(): T[] {
    return [...this.items];
  }

  toReversed(): T[] {
    return this.items.toReversed();
  }

  filter<S extends T>(predicate: (value: T, index: number) => value is S): S[];
  filter(predicate: (value: T, index: number) => boolean): T[];
  filter(predicate: (value: T, index: number) => boolean): T[] {
    return this.items.filter(predicate);
  }

  forEach(
    callback: (value: T, index: number, array: T[]) => void,
    thisArg?: unknown,
  ): void {
    this.items.forEach(callback, thisArg);
  }

  /**
   * Get all objects that are instances of the given type (including subclasses).
   */
  getByType<S extends T>(type: tT): S[] {
    return Array.from(this.byType.get(type) ?? []) as S[];
  }

  /**
   * Filter objects by type. Objects match if they are instances of the given type.
   */
  filterByType<S extends T>(type: tT): S[] {
    return this.getByType(type);
  }

  private registerByType(object: T): void {
    let proto = Object.getPrototypeOf(object);

    while (proto && proto !== Object.prototype) {
      const constructor = proto.constructor as tT;

      if (!this.byType.has(constructor)) {
        this.byType.set(constructor, new Set());
      }

      this.byType.get(constructor)!.add(object);
      proto = Object.getPrototypeOf(proto);
    }
  }

  private unregisterByType(object: T): void {
    let proto = Object.getPrototypeOf(object);

    while (proto && proto !== Object.prototype) {
      const constructor = proto.constructor as tT;
      this.byType.get(constructor)?.delete(object);
      proto = Object.getPrototypeOf(proto);
    }
  }
}
