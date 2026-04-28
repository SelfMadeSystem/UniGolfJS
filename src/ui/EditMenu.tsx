import { PlayScene } from "@/scenes/playScene";
import { $scene, getLevelScene } from "@/scenes/state";
import { motion } from "motion/react";
import { PlaceMenu } from "./editor/PlaceMenu";
import { placeables } from "@/game/editor/placeables";

export function EditMenu() {
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
      <div className="absolute top-0 right-0">
        <PlaceMenu placeables={placeables} />
      </div>
    </motion.div>
  );
}
