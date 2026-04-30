import { atom } from "nanostores";
import { defaultPlaceable, type Placeable } from "./placeables";
import { $scene } from "@/scenes/state";
import { EditScene } from "@/scenes/editScene";
import type { LevelObject } from "../objects/levelObject";

export const $selectedPlaceable = atom<Placeable>(defaultPlaceable);
export const $selectedObjects = atom<LevelObject[]>([]);
export const $copiedObjectProperties = atom<Record<string, unknown> | null>(
  null,
);

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

export function setCopiedObjectProperties(
  properties: Record<string, unknown> | null,
) {
  $copiedObjectProperties.set(properties);
}
