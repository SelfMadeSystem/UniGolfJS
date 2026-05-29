import type { Drawable } from "@/render/drawable";
import type { GameObject } from "./objects/gameObject";

/**
 * Central ownership for game objects.
 *
 * The backing structure stays simple for now: a stable ordered list plus an ID
 * index for direct lookup. Objects are also indexed by their class and superclasses
 * for efficient type-based queries. Spatial partitioning can be layered in later
 * without changing the public API of the collection.
 */
// TODO: add spatial partitioning
export class GameObjectCollection<
  T extends GameObject<any> = GameObject<any>,
> implements Iterable<T> {
  private readonly items: T[] = [];
  private readonly byId = new Map<string, T>();
  private readonly byType = new Map<typeof GameObject<any>, Set<T>>();

  constructor(objects: Iterable<T> = []) {
    this.replace(objects);
  }

  [Symbol.iterator](): Iterator<T> {
    return this.items[Symbol.iterator]();
  }

  get size(): number {
    return this.items.length;
  }

  drawableObjects(): Iterable<T> {
    return this.byType
      .entries()
      .filter(([type]) => type.hasRender())
      .flatMap(([, objects]) => objects);
  }

  drawableStatic(): Iterable<Drawable> {
    return this.byType
      .keys()
      .filter((type) => type.hasStaticRender())
      .map((type) => type.staticDrawable());
  }

  add(object: T): void {
    if (this.byId.has(object.id)) {
      throw new Error(`Duplicate game object id: ${object.id}`);
    }

    this.items.push(object);
    this.byId.set(object.id, object);
    this.registerByType(object);
  }

  prepend(object: T): void {
    if (this.byId.has(object.id)) {
      throw new Error(`Duplicate game object id: ${object.id}`);
    }

    this.items.unshift(object);
    this.byId.set(object.id, object);
    this.registerByType(object);
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

    this.unregisterByType(object);
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
    this.byType.clear();
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
  getByType<S extends T>(type: typeof GameObject<any>): S[] {
    return Array.from(this.byType.get(type) ?? []) as S[];
  }

  /**
   * Filter objects by type. Objects match if they are instances of the given type.
   */
  filterByType<S extends T>(type: typeof GameObject<any>): S[] {
    return this.getByType(type);
  }

  private registerByType(object: T): void {
    let proto = Object.getPrototypeOf(object);

    while (proto && proto !== Object.prototype) {
      const constructor = proto.constructor as typeof GameObject<any>;

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
      const constructor = proto.constructor as typeof GameObject<any>;
      this.byType.get(constructor)?.delete(object);
      proto = Object.getPrototypeOf(proto);
    }
  }
}
