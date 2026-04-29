import { PlayScene } from "@/scenes/playScene";
import { $scene, getLevelScene } from "@/scenes/state";
import { motion } from "motion/react";
import { PlaceMenu } from "./editor/PlaceMenu";
import { placeables } from "@/game/editor/placeables";
import { Icon } from "@iconify/react";
import { useState, useEffect } from "react";
import { useStore } from "@nanostores/react";
import { $selectedPlaceable } from "@/game/editor/state";
import { EditScene } from "@/scenes/editScene";
import type { Tool } from "@/game/editor/editManager";

export function EditMenu() {
  const [showPlaceMenu, setShowPlaceMenu] = useState(false);
  const selectedPlaceable = useStore($selectedPlaceable);
  const [selectedTool, setSelectedTool] = useState<Tool>(() => {
    const ls = getLevelScene();
    if (ls instanceof EditScene) return ls.editManager.selectedTool;
    return "select";
  });

  const setTool = (tool: Tool) => {
    const levelScene = getLevelScene();
    if (!(levelScene instanceof EditScene)) return;
    const em = levelScene.editManager;
    em.selectedTool = tool;
    em.setMode(tool);
    setSelectedTool(tool);
  };

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute top-0 left-0">
        <button
          className="pointer-events-auto px-4 py-2 bg-gray-800 text-white rounded cursor-pointer"
          onClick={() => {
            const levelScene = getLevelScene();
            if (levelScene) {
              $scene.set(new PlayScene(levelScene.level));
            }
          }}
        >
          Play Level
        </button>
      </div>
      <div className="absolute top-0 right-0 flex gap-2 p-2">
        <div className="pointer-events-auto">
          <button
            title="Select"
            className={`cursor-pointer px-3 py-2 rounded flex items-center gap-2 ${
              selectedTool === "select"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-white"
            }`}
            onClick={() => setTool("select")}
          >
            <Icon icon="mdi:cursor-default" width={18} height={18} />
          </button>
        </div>

        <div className="pointer-events-auto">
          <button
            title="Pan"
            className={`cursor-pointer px-3 py-2 rounded flex items-center gap-2 ${
              selectedTool === "pan"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-white"
            }`}
            onClick={() => setTool("pan")}
          >
            <Icon icon="mdi:pan" width={18} height={18} />
          </button>
        </div>

        <div className="pointer-events-auto flex items-center gap-1">
          <button
            title="Place"
            className={`cursor-pointer px-3 py-2 rounded flex items-center gap-2 ${
              selectedTool === "place"
                ? "bg-blue-600 text-white"
                : "bg-gray-800 text-white"
            }`}
            onClick={() => setTool("place")}
          >
            <Icon icon={selectedPlaceable?.icon} width={18} height={18} />
          </button>
          <button
            title="Open place menu"
            className="cursor-pointer px-2 py-2 bg-gray-800 text-white rounded"
            onClick={() => {
              setShowPlaceMenu((s) => !s);
              setTool("place");
            }}
          >
            <Icon icon="mdi:chevron-down" width={18} height={18} />
          </button>
        </div>
      </div>

      {showPlaceMenu && (
        <PlaceMenu
          placeables={placeables}
          onClose={() => setShowPlaceMenu(false)}
        />
      )}
    </motion.div>
  );
}
