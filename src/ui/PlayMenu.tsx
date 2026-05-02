import { MenuScene } from "@/scenes/menuScene";
import { $scene, getLevelScene } from "@/scenes/state";
import { motion } from "motion/react";
import { EditMenu } from "./EditMenu";
import { EditScene } from "@/scenes/editScene";

export function PlayMenu() {
  return (
    <motion.div
      className="absolute top-0 left-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="hidden px-4 py-2 bg-gray-800 text-white rounded cursor-pointer"
        onClick={() => {
          $scene.set(new MenuScene());
        }}
      >
        Back to Menu
      </button>
      <button
        className="px-4 py-2 bg-gray-800 text-white rounded cursor-pointer"
        onClick={() => {
          const levelScene = getLevelScene();
          if (levelScene) {
            $scene.set(new EditScene(levelScene.level));
          }
        }}
      >
        Edit Level
      </button>
    </motion.div>
  );
}
