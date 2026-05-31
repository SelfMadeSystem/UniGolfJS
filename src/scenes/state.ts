import type { Scene } from "@/scenes/scene";
import { atom } from "nanostores";
import { LevelScene } from "./levelScene";
import { defaultLevel } from "@/game/defaultLevel";
import { EditScene } from "./editScene";
import type { LevelConfig } from "@/game/levelConfig";

export const $scene = atom<Scene>(new EditScene(defaultLevel()));

export function getLevelScene(): LevelScene | null {
  const scene = $scene.get();
  if (scene instanceof LevelScene) {
    return scene;
  } else {
    return null;
  }
}

export function getLevelConfig(): LevelConfig {
  const scene = getLevelScene();
  if (!scene) {
    throw new Error("Not in a level scene");
  }
  return scene.level.config;
}

