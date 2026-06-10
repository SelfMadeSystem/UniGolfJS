import type { ComponentType } from 'react';
import z from 'zod';

export type FieldComponentProps<T = any> = {
  value: T;
  onChange: (v: T) => void;
  schema: z.ZodTypeAny;
  object: unknown;
  key: string;
};

export type FieldComponent = ComponentType<FieldComponentProps<any>>;

const componentRegistry = z.registry<{ comp: FieldComponent }>();

export function registerSchemaComponent(
  schema: z.ZodType,
  comp: FieldComponent,
) {
  // for some reason, this is crashing the TypeScript compiler
  (componentRegistry as any).add(schema, { comp });
}

function unwrapZodType<T extends z.ZodType>(schema: T): z.ZodType {
  const meta = schema.meta();
  if (meta && 'hidden' in meta && meta.hidden) {
    // this schema won't be in the registry, so it should stay hidden if we don't unwrap it
    return schema;
  }
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    return unwrapZodType(schema.unwrap() as z.ZodType);
  }
  return schema;
}

export function getSchemaComponent(
  schema: z.ZodTypeAny,
): FieldComponent | null {
  const base = unwrapZodType(schema);
  const meta = componentRegistry.get(base);
  return (meta?.comp as FieldComponent) ?? null;
}
