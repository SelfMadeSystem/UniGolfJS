import { atom } from "nanostores";
import type { Placeable } from "./placeables";
import { $scene } from "@/scenes/state";
import { EditScene } from "@/scenes/editScene";

export const $selectedPlaceable = atom<Placeable | null>(null);

export function setSelectedPlaceable(placeable: Placeable | null) {
  $selectedPlaceable.set(placeable);
  const scene = $scene.get();
  if (!(scene instanceof EditScene)) return;
  
  if (placeable) {
    scene.editManager.setMode("place");
  } else {
    scene.editManager.setMode("select");
  }
}
