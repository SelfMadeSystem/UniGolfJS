import { getLevelScene } from "@/scenes/state";
import { EditScene } from "@/scenes/editScene";
import { useState } from "react";

const GRID_SIZE_OPTIONS = [1, 12.5, 25, 50, 100] as const;

export function EditorOptions() {
  const levelScene = getLevelScene();
  const initialGridSize =
    levelScene instanceof EditScene ? levelScene.editorGrid.gridSize : 25;
  const [gridSize, setGridSize] = useState(initialGridSize);

  const handleGridSizeChange = (value: number) => {
    const scene = getLevelScene();
    if (!(scene instanceof EditScene)) return;

    scene.editorGrid.gridSize = value;
    setGridSize(value);
  };

  return (
    <div className="pointer-events-auto rounded bg-gray-900/90 px-3 py-2 text-sm text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      <div className="mb-2 text-gray-300">Editor options</div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-gray-200">Grid size</span>
        <select
          className="rounded bg-gray-800 px-2 py-1 text-white outline-none ring-1 ring-white/10"
          value={gridSize}
          onChange={(event) => handleGridSizeChange(Number(event.target.value))}
        >
          {GRID_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}px
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
