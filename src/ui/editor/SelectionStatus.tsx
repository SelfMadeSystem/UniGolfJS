import { ObjectPropertyEditor } from './ObjectPropertyEditor';
import { $copiedObjectProperties, $selectedObjects } from '@/game/editor/state';
import { LevelObject } from '@/game/objects/levelObject';
import { EditScene } from '@/scenes/editScene';
import { $scene } from '@/scenes/state';
import { Vector2 } from '@/utils/vec';
import { useStore } from '@nanostores/react';
import { useCallback } from 'react';

export function SelectionStatus() {
  const selectedObjects = useStore($selectedObjects);
  const copiedObjectProperties = useStore($copiedObjectProperties);

  const pasteProperties = useCallback(() => {
    if (!copiedObjectProperties) return;
    const seldObjs = [...selectedObjects];

    const oldValues = new Map<LevelObject, Map<string, any>>();
    const entries = Object.entries(copiedObjectProperties);

    for (const obj of seldObjs) {
      if (!(obj instanceof LevelObject)) continue;
      const map = new Map<string, any>();

      const shape = obj.schema.shape ?? {};
      for (const [key, value] of entries) {
        if (key === 'id' || !(key in shape)) continue;
        map.set(key, obj.get(key as any));
        // TODO: validate value against field schema
        obj.set(key as any, clonePropertyValue(value));
      }

      oldValues.set(obj, map);
    }

    const scene = $scene.get();
    if (!(scene instanceof EditScene)) return;
    scene.editManager.history.push({
      name: `Paste values`,
      redo() {
        for (const obj of seldObjs) {
          if (!(obj instanceof LevelObject)) continue;
          const shape = obj.schema.shape ?? {};
          for (const [key, value] of entries) {
            if (key === 'id' || !(key in shape)) continue;
            obj.set(key as any, clonePropertyValue(value));
          }
        }
      },
      undo() {
        for (const [obj, map] of oldValues) {
          for (const [k, v] of map) {
            obj.set(k as any, v);
          }
        }
      },
    });
  }, [copiedObjectProperties, selectedObjects]);

  return (
    <div className="pointer-events-auto rounded bg-gray-900/90 px-3 py-2 text-sm text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="pointer-events-none text-gray-300">
          {selectedObjects.length} selected
        </div>
        <button
          className="rounded bg-blue-600 px-2 py-1 text-white disabled:cursor-not-allowed disabled:bg-gray-700"
          onClick={pasteProperties}
          disabled={!copiedObjectProperties || selectedObjects.length === 0}
          title="Paste copied properties to all selected objects"
        >
          Paste
        </button>
      </div>
      <ObjectPropertyEditor />
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
