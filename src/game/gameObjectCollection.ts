import type { GameObject } from "./objects/gameObject";

/**
 * Central ownership for game objects.
 *
 * The backing structure stays simple for now: a stable ordered list plus an ID
 * index for direct lookup. Spatial partitioning can be layered in later without
 * changing the public API of the collection.
 */
// TODO: add spatial partitioning
export class GameObjectCollection<
  T extends GameObject<any> = GameObject<any>,
> implements Iterable<T> {
  private readonly items: T[] = [];
  private readonly byId = new Map<string, T>();

  constructor(objects: Iterable<T> = []) {
    this.replace(objects);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  get size(): number {
    return this.items.length;
  }

  add(object: T): void {
    if (this.byId.has(object.id)) {
      throw new Error(`Duplicate game object id: ${object.id}`);
    }

    this.items.push(object);
    this.byId.set(object.id, object);
  }

  prepend(object: T): void {
    if (this.byId.has(object.id)) {
      throw new Error(`Duplicate game object id: ${object.id}`);
    }

    this.items.unshift(object);
    this.byId.set(object.id, object);
  }

  remove(object: T): boolean {
    return this.removeById(object.id) !== null;
  }

  removeById(id: string): T | null {
    const object = this.byId.get(id);
    if (!object) return null;

    this.byId.delete(id);
    const index = this.items.indexOf(object);
    if (index !== -1) {
      this.items.splice(index, 1);
    }

    return object;
  }

  getById(id: string): T | null {
    return this.byId.get(id) ?? null;
  }

  replace(objects: Iterable<T>): void {
    this.clear();
    for (const object of objects) {
      this.add(object);
    }
  }

  clear(): void {
    this.items.length = 0;
    this.byId.clear();
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
}
