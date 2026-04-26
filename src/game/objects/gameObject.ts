import { Vec2Schema } from "@/utils/data";
import type { Drawable, RenderInfo, RenderPass } from "@/render/drawable";
import { Vector2 } from "@/utils/vec";
import z from "zod";

export const GameObjectSchema = z.object({
  /** The center position of the object. */
  position: Vec2Schema.default(new Vector2(0, 0)),
  /** The size of the object. Represents the width and height of the object's AABB. */
  scale: Vec2Schema.default(new Vector2(1, 1)),
  debug: z.boolean().default(false),
});

type GameObjectKey<SchemaType extends typeof GameObjectSchema> = Extract<
  keyof z.infer<SchemaType>,
  string
>;
type GameObjectListener<
  SchemaType extends typeof GameObjectSchema,
  K extends GameObjectKey<SchemaType> | 'position' | 'scale',
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

  public pos: Vector2;

  get scale(): Vector2 {
    return this.data.scale;
  }

  constructor(options: z.input<typeof GameObjectSchema>) {
    this.data = this.schema.parse(options);
    this.pos = this.data.position;
  }

  on<K extends SchemaKeys | 'position' | 'scale'>(
    key: K,
    listener: GameObjectListener<SchemaType, K>,
  ): void;
  on<K extends SchemaKeys>(
    key: K,
    listener: GameObjectListener<SchemaType, K>,
  ): void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(listener as (value: unknown) => void);
  }

  onAny(listener: (key: string, value: unknown) => void): void {
    this.anyListeners.add(listener);
  }

  protected emit<K extends GameObjectKey<SchemaType> | 'position' | 'scale'>(
    key: K,
    value: z.infer<SchemaType>[K],
  ): void
  protected emit<K extends GameObjectKey<SchemaType>>(
    key: K,
    value: z.infer<SchemaType>[K],
  ): void {
    this.listeners.get(key)?.forEach((listener) => listener(value));
    this.anyListeners.forEach((listener) => listener(key, value));
  }

  set<K extends SchemaKeys>(
    key: K,
    value: z.infer<SchemaType>[K],
  ): void {
    this.data[key] = value;
    this.emit(key, value);
  }

  get<K extends SchemaKeys>(
    key: K,
  ): z.infer<SchemaType>[K] {
    return this.data[key];
  }

  getData(): z.infer<SchemaType> {
    return this.data;
  }

  abstract render(info: RenderInfo): Iterable<RenderPass>;
  tick(): void {}
}
