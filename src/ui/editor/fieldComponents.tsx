import {
  type FieldComponentProps,
  registerSchemaComponent,
  registerZodTypeComponent,
} from './schemaRegistry';
import { SelectObjectMode } from '@/game/editor/modes/selectObjectMode';
import { Vec2PosMode } from '@/game/editor/modes/vec2PosMode';
import { LAYERS } from '@/game/levelConfig';
import { getLevelObjectClass } from '@/game/levelObjectRegistry';
import type { LevelObject } from '@/game/objects/levelObject';
import { pass } from '@/render/drawable';
import { EditScene } from '@/scenes/editScene';
import { getLevelScene } from '@/scenes/state';
import {
  NormalVec2Schema,
  Vec2Schema,
  booleanSchema,
  numberSchema,
  objectIdSchema,
  positiveNumberSchema,
  rgbSchema,
  rotationSchema,
  shapeSchema,
  stringSchema,
} from '@/utils/data';
import { Vector2 } from '@/utils/vec';
import { useCallback, useEffect, useState } from 'react';

// showInEditor meta: when true, display a picker button to set Vec2 from scene
// relativeTo meta: when set, the picker will be relative to the specified object's value
// multiplier meta: when set, multiplies the value by that amount in the picker
function Vec2Field({
  value,
  onChange,
  schema,
  object,
}: FieldComponentProps<Vector2>) {
  const meta = schema.meta?.();
  const showPicker = meta?.showInEditor === true;
  const relativeTo = meta?.relativeTo as string | undefined;
  const multiplier = (meta?.multiplier as number) ?? 1;
  const [isPicking, setIsPicking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
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

  useEffect(() => {
    if (!isHovered) return;

    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;

    const vec = value
      .mult(multiplier)
      .add((object as any)[relativeTo as string] ?? new Vector2(0, 0));
    levelScene.editManager.specialDrawables.set('Vec2FieldPreview', {
      render: function* () {
        yield pass(LAYERS.EDITOR, ctx => {
          ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
          ctx.beginPath();
          ctx.arc(vec.x, vec.y, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#000000';
          ctx.stroke();
        });
      },
    });

    return () => {
      levelScene.editManager.specialDrawables.delete('Vec2FieldPreview');
    };
  }, [isHovered, multiplier, object, relativeTo, value]);

  const startPicker = useCallback(() => {
    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;

    const editManager = levelScene.editManager;
    const restoreMode = editManager.currentMode;

    // if already in a Vec2PosMode, cancel it
    if (editManager.currentMode instanceof Vec2PosMode) {
      editManager.currentMode.cancel();
      return;
    }

    const mode = new Vec2PosMode(
      editManager,
      value,
      (object as any)[relativeTo as string] ?? new Vector2(0, 0),
      multiplier,
      pos => onChange(pos),
      () => {
        setIsPicking(false);
        editManager.overrideMode = false;
      },
      restoreMode,
    );

    editManager.currentMode = mode;
    editManager.overrideMode = true;
    setIsPicking(true);
  }, [value, multiplier, object, relativeTo, onChange]);

  if (!showPicker)
    return (
      <div className="flex gap-2">
        <input
          className="w-20 rounded bg-gray-800 px-2 text-white"
          type="number"
          value={value.x}
          onChange={setX}
        />
        <input
          className="w-20 rounded bg-gray-800 px-2 text-white"
          type="number"
          value={value.y}
          onChange={setY}
        />
      </div>
    );

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2">
        <input
          className="w-20 rounded bg-gray-800 px-2 text-white"
          type="number"
          value={value.x}
          onChange={setX}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
        <input
          className="w-20 rounded bg-gray-800 px-2 text-white"
          type="number"
          value={value.y}
          onChange={setY}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        />
      </div>
      <button
        type="button"
        className="rounded bg-gray-700 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-800"
        onClick={startPicker}
        title={isPicking ? 'Cancel picking' : 'Pick position'}
      >
        {isPicking ? 'Cancel' : 'Pick'}
      </button>
    </div>
  );
}

function NormalVec2Field({ value, onChange }: FieldComponentProps<Vector2>) {
  const angle = Math.round((value.angle() * 180) / Math.PI);

  const setAngle = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newAngle = (Number(e.target.value) * Math.PI) / 180;
      onChange(Vector2.fromAngle(newAngle));
    },
    [onChange],
  );

  const rotateCw = useCallback(() => {
    onChange(value.ccw90());
  }, [value, onChange]);

  const rotateCcw = useCallback(() => {
    onChange(value.cw90());
  }, [value, onChange]);

  return (
    <div className="flex items-center gap-2">
      <input
        className="w-20 rounded bg-gray-800 px-2 text-white"
        type="number"
        value={angle}
        min={-180}
        max={180}
        onChange={setAngle}
      />
      <button
        type="button"
        className="rounded bg-gray-700 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-800"
        onClick={rotateCw}
        title="Rotate clockwise"
      >
        CW
      </button>
      <button
        type="button"
        className="rounded bg-gray-700 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-800"
        onClick={rotateCcw}
        title="Rotate counter-clockwise"
      >
        CCW
      </button>
    </div>
  );
}

function ColorField({ value, onChange }: FieldComponentProps<string>) {
  return (
    <input
      className="w-24 rounded bg-gray-800 px-2 text-white"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function ShapeField({ value, onChange }: FieldComponentProps<string>) {
  return (
    <select
      className="rounded bg-gray-800 px-2 text-white"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {shapeSchema.options.map(option => (
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
      className="rounded bg-gray-800 px-2 text-white"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    >
      {rotationSchema.options.map(option => (
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
      className="w-24 rounded bg-gray-800 px-2 text-white"
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    />
  );
}

function PositiveNumberField({ value, onChange }: FieldComponentProps<number>) {
  return (
    <input
      className="w-24 rounded bg-gray-800 px-2 text-white"
      type="number"
      min={0}
      value={value}
      onChange={e => onChange(Math.max(0, Number(e.target.value)))}
    />
  );
}

function BooleanField({ value, onChange }: FieldComponentProps<boolean>) {
  return (
    <input
      type="checkbox"
      checked={value}
      onChange={e => onChange(Boolean(e.target.checked))}
    />
  );
}

function StringField({ value, onChange }: FieldComponentProps<string>) {
  return (
    <input
      className="w-full rounded bg-gray-800 px-2 text-white"
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
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
    typeof ofType === 'string' ? getLevelObjectClass(ofType) : null;
  const [isPicking, setIsPicking] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) return;

    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;

    const object = levelScene.objects.getById(value);
    if (!object) return;
    levelScene.editManager.highlightedObject = object as LevelObject<any>;

    return () => {
      levelScene.editManager.highlightedObject = null;
    };
  }, [ObjectClass, isHovered, value]);

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
      object => onChange(object.id),
      () => {
        setIsPicking(false);
        editManager.overrideMode = false;
      },
      restoreMode,
    );

    editManager.currentMode = som;
    editManager.overrideMode = true;

    setIsPicking(true);
  }, [ObjectClass, onChange]);

  return (
    <div className="flex items-center gap-2">
      <input
        className="w-24 rounded bg-gray-800 px-2 text-white"
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      <button
        type="button"
        className="rounded bg-gray-700 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-800"
        onClick={startPicker}
        disabled={!ObjectClass}
        title={
          isPicking
            ? 'Cancel picking'
            : ObjectClass
              ? `Pick an object of type ${ObjectClass.name}`
              : 'Pick an object'
        }
      >
        {isPicking ? 'Cancel' : 'Pick'}
      </button>
    </div>
  );
}

function ArrayField({
  value,
  onChange,
  schema,
}: FieldComponentProps<unknown[]>) {
  // TODO
  return null;
}

registerSchemaComponent(Vec2Schema, Vec2Field);
registerSchemaComponent(NormalVec2Schema, NormalVec2Field);
registerSchemaComponent(rgbSchema, ColorField);
registerSchemaComponent(shapeSchema, ShapeField);
registerSchemaComponent(rotationSchema, RotationField);
registerSchemaComponent(numberSchema, NumberField);
registerSchemaComponent(positiveNumberSchema, PositiveNumberField);
registerSchemaComponent(booleanSchema, BooleanField);
registerSchemaComponent(stringSchema, StringField);
registerSchemaComponent(objectIdSchema, ObjectIdField);
registerZodTypeComponent('array', ArrayField);
