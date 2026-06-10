import { ObjectPropertyEditor } from './ObjectPropertyEditor';
import { $copiedObjectProperties, $selectedObjects } from '@/game/editor/state';
import { LevelObject } from '@/game/objects/levelObject';
import { Vector2 } from '@/utils/vec';
import { useStore } from '@nanostores/react';
import { useCallback } from 'react';

export function SelectionStatus() {
  const selectedObjects = useStore($selectedObjects);
  const copiedObjectProperties = useStore($copiedObjectProperties);

  const pasteProperties = useCallback(() => {
    if (!copiedObjectProperties) return;

    for (const obj of selectedObjects) {
      if (!(obj instanceof LevelObject)) continue;

      const shape = obj.schema.shape ?? {};
      for (const [key, value] of Object.entries(copiedObjectProperties)) {
        if (key === 'id' || !(key in shape)) continue;
        // TODO: validate value against field schema
        obj.set(key as any, clonePropertyValue(value));
      }
    }
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
      {selectedObjects.length === 1 ? <ObjectPropertyEditor /> : null}
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
