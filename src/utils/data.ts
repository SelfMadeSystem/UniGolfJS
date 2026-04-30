import { Vector2 } from "@/utils/vec";
import z from "zod";

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

export const rgbSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
export const rgbaSchema = z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/);