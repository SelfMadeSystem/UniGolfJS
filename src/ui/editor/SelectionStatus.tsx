import { $selectedObjects } from "@/game/editor/state";
import { useStore } from "@nanostores/react";

export function SelectionStatus() {
  const selectedObjects = useStore($selectedObjects);

  return (
    <div className="pointer-events-none rounded bg-gray-900/90 px-3 py-2 text-sm text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      {selectedObjects.length} selected
    </div>
  );
}
