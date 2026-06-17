import { EditorOptions } from './editor/EditorOptions';
import { LevelControls } from './editor/LevelControls';
import { PlaceMenu } from './editor/PlaceMenu';
import { SelectionStatus } from './editor/SelectionStatus.tsx';
import type { Tool } from '@/game/editor/editManager';
import { placeableGroups } from '@/game/editor/placeables';
import { $selectedPlaceable } from '@/game/editor/state';
import { EditScene } from '@/scenes/editScene';
import { getLevelScene } from '@/scenes/state';
import { $hasRedo, $hasUndo } from '@/stores/history.ts';
import { Icon } from '@iconify/react';
import { useStore } from '@nanostores/react';
import { motion } from 'motion/react';
import { useState } from 'react';

export function EditMenu() {
  const [showPlaceMenu, setShowPlaceMenu] = useState(false);
  const selectedPlaceable = useStore($selectedPlaceable);
  const [selectedTool, setSelectedTool] = useState<Tool>(() => {
    const ls = getLevelScene();
    if (ls instanceof EditScene) return ls.editManager.selectedTool;
    return 'select';
  });
  const hasUndo = useStore($hasUndo);
  const hasRedo = useStore($hasRedo);

  const setTool = (tool: Tool) => {
    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;
    const em = levelScene.editManager;
    em.selectedTool = tool;
    em.setMode(tool);
    setSelectedTool(tool);
  };

  const undo = () => {
    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;
    levelScene.editManager.history.undo();
  };

  const redo = () => {
    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;
    levelScene.editManager.history.redo();
  };

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="pointer-events-auto absolute top-0 left-0">
        <LevelControls />
      </div>
      <div className="absolute top-0 right-0 flex flex-col items-end justify-end gap-2 p-2">
        <div className="flex gap-2">
          <div className="pointer-events-auto">
            <button
              title="Select"
              className={`flex cursor-pointer items-center gap-2 rounded px-3 py-2 ${
                selectedTool === 'select'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-white'
              }`}
              onClick={() => setTool('select')}
            >
              <Icon icon="mdi:cursor-default" width={18} height={18} />
            </button>
          </div>
          <div className="pointer-events-auto">
            <button
              title="Pan"
              className={`flex cursor-pointer items-center gap-2 rounded px-3 py-2 ${
                selectedTool === 'pan'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-white'
              }`}
              onClick={() => setTool('pan')}
            >
              <Icon icon="mdi:pan" width={18} height={18} />
            </button>
          </div>
          <div className="pointer-events-auto flex items-center gap-1">
            <button
              title="Place"
              className={`flex cursor-pointer items-center gap-2 rounded px-3 py-2 ${
                selectedTool === 'place'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-white'
              }`}
              onClick={() => setTool('place')}
            >
              <Icon
                icon={selectedPlaceable?.icon}
                color={selectedPlaceable?.iconColor}
                width={18}
                height={18}
              />
            </button>
            <button
              title="Open place menu"
              className="cursor-pointer rounded bg-gray-800 px-2 py-2 text-white"
              onClick={() => {
                setShowPlaceMenu(s => !s);
              }}
            >
              <Icon icon="mdi:chevron-down" width={18} height={18} />
            </button>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="pointer-events-auto">
            <button
              title="Undo"
              className="flex cursor-pointer items-center gap-2 rounded bg-gray-800 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasUndo}
              onClick={() => undo()}
            >
              <Icon icon="mdi:undo" width={18} height={18} />
            </button>
          </div>
          <div className="pointer-events-auto">
            <button
              title="Redo"
              className="flex cursor-pointer items-center gap-2 rounded bg-gray-800 px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!hasRedo}
              onClick={() => redo()}
            >
              <Icon icon="mdi:redo" width={18} height={18} />
            </button>
          </div>
        </div>
      </div>

      {showPlaceMenu && (
        <PlaceMenu
          placeableGroups={placeableGroups}
          onClose={() => setShowPlaceMenu(false)}
          onSelectClose={() => {
            setShowPlaceMenu(false);
            setTool('place');
          }}
        />
      )}

      <div className="absolute bottom-4 left-4">
        <EditorOptions />
      </div>

      <div className="absolute right-4 bottom-4">
        <SelectionStatus />
      </div>
    </motion.div>
  );
}
