import './fieldComponents';
import { getSchemaComponent } from './schemaRegistry';
import type { HistoryState } from '@/game/editor/history';
import {
  $selectedObjects,
  setCopiedObjectProperties,
} from '@/game/editor/state';
import { LevelObject } from '@/game/objects/levelObject';
import { EditScene } from '@/scenes/editScene';
import { $scene } from '@/scenes/state';
import { Vector2 } from '@/utils/vec';
import { useStore } from '@nanostores/react';
import { useCallback, useState, useSyncExternalStore } from 'react';
import z from 'zod';

export function ObjectPropertyEditor() {
  const selectedObjects = useStore($selectedObjects);

  // Only show editor for exactly one selected object
  if (selectedObjects.length !== 1) return null;

  const obj = selectedObjects[0];
  if (!obj || !(obj instanceof LevelObject)) return null;

  return <SingleObjectPropertyEditor object={obj} />;
}

function SingleObjectPropertyEditor({ object }: { object: LevelObject }) {
  const schema = object.schema;
  const shape = schema.shape;
  const [selectedFields, setSelectedFields] = useState<string[]>([]);

  const copySelectedFields = useCallback(() => {
    const entries = selectedFields
      .filter(fieldKey => fieldKey in (shape ?? {}))
      .map(
        fieldKey =>
          [fieldKey, clonePropertyValue(object.get(fieldKey as any))] as const,
      );

    if (entries.length === 0) return;

    setCopiedObjectProperties(Object.fromEntries(entries));
  }, [object, selectedFields, shape]);

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="text-gray-400">
          {selectedFields.length === 0
            ? 'No fields selected'
            : `${selectedFields.length} field${selectedFields.length === 1 ? '' : 's'} selected`}
        </div>
        <button
          className="rounded bg-blue-600 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-700"
          onClick={copySelectedFields}
          disabled={selectedFields.length === 0}
          title="Copy selected properties"
        >
          Copy
        </button>
      </div>
      {Object.entries(shape ?? {}).map(([key, fieldSchema]) => {
        return (
          <PropertyField
            key={key}
            fieldKey={key}
            fieldSchema={fieldSchema as z.ZodTypeAny}
            object={object}
            selected={selectedFields.includes(key)}
            onToggleSelected={() => {
              if (key === 'id') return;
              setSelectedFields(current =>
                current.includes(key)
                  ? current.filter(fieldKey => fieldKey !== key)
                  : [...current, key],
              );
            }}
          />
        );
      })}
    </div>
  );
}

function clonePropertyValue<T>(value: T): T {
  if (value instanceof Vector2) {
    return value.clone() as T;
  }

  if (value && typeof value === 'object') {
    return structuredClone(value);
  }

  return value;
}

function useObjectData(object: LevelObject, fieldKey: string) {
  return useSyncExternalStore(
    callback => {
      const onChange = () => callback();
      const off = object.on(fieldKey as any, onChange);
      return () => off();
    },
    () => (object.getData() as Record<string, unknown>)[fieldKey],
    () => (object.getData() as Record<string, unknown>)[fieldKey],
  );
}

type PropertyHistoryState = HistoryState & {
  time: number;
  key: string;
  object: LevelObject<any>;
};

function PropertyField({
  fieldKey,
  fieldSchema,
  object,
  selected,
  onToggleSelected,
}: {
  fieldKey: string;
  fieldSchema: z.ZodTypeAny;
  object: LevelObject;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const value = useObjectData(object, fieldKey);
  const FieldComp = getSchemaComponent(fieldSchema);

  const handleChange = useCallback(
    (newValue: unknown) => {
      const oldValue = object.get(fieldKey as any);
      object.set(fieldKey as any, newValue);
      const scene = $scene.get();
      if (!(scene instanceof EditScene)) return;
      const now = Date.now();
      const latestHistory = scene.editManager.history.latest;
      out: if (
        latestHistory &&
        'time' in latestHistory &&
        'key' in latestHistory &&
        'object' in latestHistory
      ) {
        const prev = latestHistory as PropertyHistoryState;
        if (
          now - prev.time > 1000 ||
          prev.key !== fieldKey ||
          prev.object !== object
        )
          break out;
        prev.time = now;
        prev.redo = () => {
          object.set(fieldKey as any, newValue);
        };
        return;
      }
      const state: PropertyHistoryState = {
        name: `Set ${fieldKey}`,
        time: now,
        key: fieldKey,
        object,
        redo() {
          object.set(fieldKey as any, newValue);
        },
        undo() {
          object.set(fieldKey as any, oldValue);
        },
      };
      scene.editManager.history.push(state);
    },
    [object, fieldKey],
  );

  const copyId = useCallback(async () => {
    const text = String(value ?? '');

    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  }, [value]);

  if (fieldKey === 'id') {
    return (
      <button
        type="button"
        className="cursor-pointer rounded px-1 py-0.5 text-left text-gray-500 italic transition hover:bg-gray-800 hover:text-gray-300"
        onClick={() => {
          void copyId();
        }}
        title="Click to copy ID"
      >
        ID: {value as string}
      </button>
    );
  }

  if (!FieldComp) {
    return null;
  }

  return (
    <div>
      <label className="flex items-center justify-between gap-2 text-gray-300">
        <span className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected()}
          />
          {fieldKey}
        </span>
        {/* Lint not applicable since it's not "created" every render, just fetched */}
        {/* eslint-disable-next-line react-hooks/static-components */}
        <FieldComp
          value={value}
          onChange={handleChange}
          schema={fieldSchema}
          object={object}
          key={fieldKey}
        />
      </label>
    </div>
  );
}
