import { $selectedObjects } from "@/game/editor/state";
import { useStore } from "@nanostores/react";
import { ObjectPropertyEditor } from "./ObjectPropertyEditor";

export function SelectionStatus() {
  const selectedObjects = useStore($selectedObjects);

  return (
    <div className="pointer-events-auto rounded bg-gray-900/90 px-3 py-2 text-sm text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      {selectedObjects.length === 1 ? (
        <ObjectPropertyEditor />
      ) : (
        <div className="pointer-events-none">
          {selectedObjects.length} selected
        </div>
      )}
    </div>
  );
}
