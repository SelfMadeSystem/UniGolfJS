import { atom } from "nanostores";
import { placeables, type Placeable } from "./placeables";
import { $scene } from "@/scenes/state";
import { EditScene } from "@/scenes/editScene";
import type { LevelObject } from "../objects/levelObject";

export const $selectedPlaceable = atom<Placeable>(placeables[0]!);
export const $selectedObjects = atom<LevelObject[]>([]);

export function setSelectedPlaceable(placeable: Placeable) {
  $selectedPlaceable.set(placeable);
  const scene = $scene.get();
  if (!(scene instanceof EditScene)) return;

  scene.editManager.setMode("place");
  scene.editManager.selectedTool = "place";
}

export function syncSelectedObjects(objects: Iterable<LevelObject>) {
  $selectedObjects.set([...objects]);
}
