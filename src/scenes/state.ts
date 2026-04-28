import type { Scene } from "@/scenes/scene";
import { atom } from "nanostores";
import { LevelScene } from "./levelScene";
import { defaultLevel } from "@/game/defaultLevel";
import { EditScene } from "./editScene";

export const $scene = atom<Scene>(new EditScene(defaultLevel()));

export function getLevelScene(): LevelScene | null {
  const scene = $scene.get();
  if (scene instanceof LevelScene) {
    return scene;
  } else {
    return null;
  }
}
