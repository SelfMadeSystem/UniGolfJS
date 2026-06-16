import { Vector2 } from '@/utils/vec';
import z from 'zod';

export const Vec2Schema = z.codec(
  z.union([
    z.object({
      x: z.number(),
      y: z.number(),
    }),
    z.tuple([z.number(), z.number()]),
  ]),
  z.instanceof(Vector2),
  {
    decode(input) {
      return new Vector2(input);
    },
    encode(vec: Vector2) {
      return { x: vec.x, y: vec.y };
    },
  },
);

export const NormalVec2Schema = z.codec(
  z.union([
    z.object({
      x: z.number(),
      y: z.number(),
    }),
    z.tuple([z.number(), z.number()]),
  ]),
  z.instanceof(Vector2),
  {
    decode(input) {
      return new Vector2(input).normalize();
    },
    encode(vec: Vector2) {
      return { x: vec.x, y: vec.y };
    },
  },
);

// TODO: Make a proper color component
export const rgbSchema = z.string();
// .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);

export const shapeSchema = z.enum([
  'rectangle',
  'triangle',
  'quarterCircle',
  'inverseQuarterCircle',
  'circle',
]);
export const rotationSchema = z.union([
  z.literal(0),
  z.literal(90),
  z.literal(180),
  z.literal(270),
]);

export const numberSchema = z.number();
export const positiveNumberSchema = z.number().positive();
export const booleanSchema = z.boolean();
export const stringSchema = z.string();
/** Validated at runtime since it's non-trivial to enforce at compile or schema level */
export const objectIdSchema = z.nanoid();
