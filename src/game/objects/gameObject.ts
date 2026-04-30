import { booleanSchema, Vec2Schema } from "@/utils/data";
import type { Drawable, RenderInfo, RenderPass } from "@/render/drawable";
import { Vector2 } from "@/utils/vec";
import z from "zod";
import { getLevelScene } from "@/scenes/state";

export const GameObjectSchema = z.object({
  /** IDs should be unique */
  id: z.string().default(() => crypto.randomUUID()),
  /** The center position of the object. */
  position: Vec2Schema.default(new Vector2(0, 0)),
  debug: booleanSchema.default(false),
});

type GameObjectKey<SchemaType extends typeof GameObjectSchema> = Extract<
  keyof z.infer<SchemaType>,
  string
>;
type GameObjectListener<
  SchemaType extends typeof GameObjectSchema,
  K extends GameObjectKey<SchemaType> | "position",
> = (value: z.infer<SchemaType>[K]) => void;

export abstract class GameObject<
  SchemaType extends typeof GameObjectSchema = typeof GameObjectSchema,
  SchemaKeys extends GameObjectKey<SchemaType> = GameObjectKey<SchemaType>,
> implements Drawable {
  static schema = GameObjectSchema;
  private readonly listeners = new Map<
    GameObjectKey<SchemaType>,
    Set<(value: unknown) => void>
  >();
  private readonly anyListeners = new Set<
    (key: string, value: unknown) => void
  >();
  protected data: z.infer<SchemaType>;

  get schema(): SchemaType {
    return (this.constructor as typeof GameObject).schema as SchemaType;
  }

  get id(): string {
    return this.data.id;
  }

  public pos: Vector2;

  constructor(options: z.input<typeof GameObjectSchema>) {
    this.data = this.schema.parse(options);
    this.pos = this.data.position;
  }

  on<K extends SchemaKeys | "position">(
    key: K,
    listener: GameObjectListener<SchemaType, K>,
  ): () => void;
  on<K extends SchemaKeys>(
    key: K,
    listener: GameObjectListener<SchemaType, K>,
  ): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    const listeners = this.listeners.get(key)!;
    listeners.add(listener as (value: unknown) => void);
    return () => listeners.delete(listener as (value: unknown) => void);
  }

  onAny(listener: (key: string, value: unknown) => void): () => void {
    this.anyListeners.add(listener);
    return () => this.anyListeners.delete(listener);
  }

  protected emit<K extends GameObjectKey<SchemaType> | "position">(
    key: K,
    value: z.infer<SchemaType>[K],
  ): void;
  protected emit<K extends GameObjectKey<SchemaType>>(
    key: K,
    value: z.infer<SchemaType>[K],
  ): void {
    this.listeners.get(key)?.forEach((listener) => listener(value));
    this.anyListeners.forEach((listener) => listener(key, value));
  }

  set<K extends SchemaKeys>(key: K, value: z.infer<SchemaType>[K]): void {
    this.data[key] = value;
    if (key === "position") {
      this.pos = value as unknown as Vector2;
    }
    this.emit(key, value);
  }

  get<K extends SchemaKeys>(key: K): z.infer<SchemaType>[K] {
    return this.data[key];
  }

  getData(): z.infer<SchemaType> {
    return this.data;
  }

  abstract render(info: RenderInfo): Iterable<RenderPass>;
  tick(): void {}

  delete(fromLevel = false): void {
    const scene = getLevelScene();
    if (!scene) return;
    if (fromLevel) {
      scene.removeObjectFromLevel(this);
    } else {
      scene.removeObject(this);
    }
  }

  /**
   * Resets the object to its initial state.
   * If `scene` is true, also resets any scene-level state related to this object.
   */
  reset(scene = false): void {
    this.pos = this.data.position;
  }
}
