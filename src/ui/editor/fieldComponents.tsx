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
  objectIdSchema,
} from "@/utils/data";
import {
  registerSchemaComponent,
  type FieldComponentProps,
} from "./schemaRegistry";
import { useCallback, useState } from "react";
import { getLevelObjectClass } from "@/game/levelObjectRegistry";
import { getLevelScene } from "@/scenes/state";
import { EditScene } from "@/scenes/editScene";
import { SelectObjectMode } from "@/game/editor/modes/selectObjectMode";

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

function ObjectIdField({
  value,
  onChange,
  schema,
}: FieldComponentProps<string>) {
  const meta = schema.meta();
  const ofType = meta?.ofType;
  const ObjectClass =
    typeof ofType === "string" ? getLevelObjectClass(ofType) : null;
  const [isPicking, setIsPicking] = useState(false);

  const startPicker = useCallback(() => {
    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;

    const editManager = levelScene.editManager;

    if (
      editManager.currentMode instanceof SelectObjectMode &&
      editManager.currentMode.targetClass === ObjectClass
    ) {
      editManager.currentMode.cancel();
      return;
    }

    if (editManager.currentMode instanceof SelectObjectMode) {
      editManager.currentMode.cancel();
    }

    const restoreMode = editManager.currentMode;
    const som = new SelectObjectMode(
      editManager,
      ObjectClass,
      (object) => onChange(object.id),
      () => {
        setIsPicking(false);
        editManager.overrideMode = false;
      },
      restoreMode,
    );

    editManager.setInteractionMode(som);
    editManager.overrideMode = true;

    setIsPicking(true);
  }, [ObjectClass, onChange]);

  return (
    <div className="flex items-center gap-2">
      <input
        className="bg-gray-800 text-white px-2 rounded w-24"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="rounded bg-gray-700 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-800"
        onClick={startPicker}
        disabled={!ObjectClass}
        title={
          isPicking
            ? "Cancel picking"
            : ObjectClass
              ? `Pick an object of type ${ObjectClass.name}`
              : "Pick an object"
        }
      >
        {isPicking ? "Cancel" : "Pick"}
      </button>
    </div>
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
registerSchemaComponent(objectIdSchema, ObjectIdField);
