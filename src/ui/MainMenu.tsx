import { PlayScene } from "@/scenes/playScene";
import { $scene } from "@/scenes/state";
import { motion } from "motion/react";

export function MainMenu() {
  return (
    <motion.div
      className="absolute inset-0 flex flex-col h-full w-full items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold">UniGolfJS</h1>
      <button
        className="mt-4 rounded bg-green-500 px-4 py-2 text-white cursor-pointer"
        onClick={() => {
          $scene.set(new PlayScene());
        }}
      >
        Start Game
      </button>
    </motion.div>
  );
}
