import { Vector2 } from "@/utils/vec";
import {
  Vec2Schema,
  rgbSchema,
  rgbaSchema,
  numberSchema,
  booleanSchema,
  shapeSchema,
  rotationSchema,
  positiveNumberSchema,
  stringSchema,
} from "@/utils/data";
import {
  registerSchemaComponent,
  type FieldComponentProps,
} from "./schemaRegistry";
import { useCallback } from "react";

function Vec2Field({ value, onChange }: FieldComponentProps<Vector2>) {
  const setX = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(new Vector2(Number(e.target.value), value.y)),
    [onChange, value],
  );
  const setY = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(new Vector2(value.x, Number(e.target.value))),
    [onChange, value],
  );

  return (
    <div className="flex gap-2">
      <input
        className="bg-gray-800 text-white px-2 rounded w-20"
        type="number"
        value={value.x}
        onChange={setX}
      />
      <input
        className="bg-gray-800 text-white px-2 rounded w-20"
        type="number"
        value={value.y}
        onChange={setY}
      />
    </div>
  );
}

function ColorField({ value, onChange }: FieldComponentProps<string>) {
  return (
    <input
      className="bg-gray-800 text-white px-2 rounded w-24"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function ShapeField({ value, onChange }: FieldComponentProps<string>) {
  return (
    <select
      className="bg-gray-800 text-white px-2 rounded"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {shapeSchema.options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function RotationField({ value, onChange }: FieldComponentProps<number>) {
  return (
    <select
      className="bg-gray-800 text-white px-2 rounded"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {rotationSchema.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.value}°
        </option>
      ))}
    </select>
  );
}

function NumberField({ value, onChange }: FieldComponentProps<number>) {
  return (
    <input
      className="bg-gray-800 text-white px-2 rounded w-24"
      type="number"
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

function PositiveNumberField({ value, onChange }: FieldComponentProps<number>) {
  return (
    <input
      className="bg-gray-800 text-white px-2 rounded w-24"
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
    />
  );
}

function BooleanField({ value, onChange }: FieldComponentProps<boolean>) {
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={(e) => onChange(Boolean(e.target.checked))}
    />
  );
}

function StringField({ value, onChange }: FieldComponentProps<string>) {
  return (
    <input
      className="bg-gray-800 text-white px-2 rounded w-full"
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

registerSchemaComponent(Vec2Schema, Vec2Field);
registerSchemaComponent(rgbSchema, ColorField);
registerSchemaComponent(rgbaSchema, ColorField);
registerSchemaComponent(shapeSchema, ShapeField);
registerSchemaComponent(rotationSchema, RotationField);
registerSchemaComponent(numberSchema, NumberField);
registerSchemaComponent(positiveNumberSchema, PositiveNumberField);
registerSchemaComponent(booleanSchema, BooleanField);
registerSchemaComponent(stringSchema, StringField);
