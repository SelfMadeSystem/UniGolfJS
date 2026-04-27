import { Scene } from "@/scenes/scene";
import { atom } from "nanostores";
import { LevelScene } from "./levelScene";
import { PlayScene } from "./playScene";
import { defaultLevel } from "@/game/defaultLevel";

export const $scene = atom<Scene>(new PlayScene(defaultLevel()));

export function getLevelScene(): LevelScene | null {
  const scene = $scene.get();
  if (scene instanceof LevelScene) {
    return scene;
  } else {
    return null;
  }
}
