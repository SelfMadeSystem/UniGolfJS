import { MenuScene } from "@/scenes/menuScene";
import { $scene } from "@/scenes/state";
import { motion } from "motion/react";

export function BackMenu() {
  return (
    <motion.div
      className="absolute top-0 left-0 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="px-4 py-2 bg-gray-800 text-white rounded cursor-pointer"
        onClick={() => {
          $scene.set(new MenuScene());
        }}
      >
        Back to Menu
      </button>
    </motion.div>
  );
}
