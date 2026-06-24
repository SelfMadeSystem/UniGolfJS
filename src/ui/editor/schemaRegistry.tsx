import type { ComponentType } from 'react';
import z from 'zod';
import type { $ZodTypeDef } from 'zod/v4/core';

export type FieldComponentProps<T = any> = {
  value: T;
  onChange: (v: T, undo?: () => void, redo?: () => void) => void;
  schema: z.ZodType;
  object: unknown;
  key: string;
};

export type FieldComponent = ComponentType<FieldComponentProps>;
type ZodTypeEnum = $ZodTypeDef['type'];

const componentRegistry = z.registry<{ comp: FieldComponent }>();
const zodTypeMap = new Map<ZodTypeEnum, FieldComponent>();

export function registerSchemaComponent(
  schema: z.ZodType,
  comp: FieldComponent,
) {
  // for some reason, this is crashing the TypeScript compiler
  (componentRegistry as any).add(schema, { comp });
}

export function registerZodTypeComponent(
  zodType: ZodTypeEnum,
  comp: FieldComponent,
) {
  zodTypeMap.set(zodType, comp);
}

export function getSchemaComponent(schema: z.ZodType): FieldComponent | null {
  const meta = schema.meta();
  if (meta && 'hidden' in meta && meta.hidden) {
    // this schema won't be in the registry, so it should stay hidden if we don't unwrap it
    return null;
  }
  if (componentRegistry.has(schema)) {
    return (componentRegistry.get(schema)?.comp as FieldComponent) ?? null;
  }
  if (zodTypeMap.has(schema.type)) {
    return zodTypeMap.get(schema.type) ?? null;
  }
  if ('unwrap' in schema && typeof schema.unwrap === 'function') {
    return getSchemaComponent(schema.unwrap());
  }
  return null;
}
