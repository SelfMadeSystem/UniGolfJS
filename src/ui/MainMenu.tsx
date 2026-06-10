import { defaultLevel } from '@/game/defaultLevel';
import { PlayScene } from '@/scenes/playScene';
import { $scene } from '@/scenes/state';
import { motion } from 'motion/react';

export function MainMenu() {
  return (
    <motion.div
      className="absolute inset-0 flex h-full w-full flex-col items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h1 className="text-4xl font-bold">UniGolfJS</h1>
      <button
        className="mt-4 cursor-pointer rounded bg-green-500 px-4 py-2 text-white"
        onClick={() => {
          $scene.set(new PlayScene(defaultLevel()));
        }}
      >
        Start Game
      </button>
    </motion.div>
  );
}
