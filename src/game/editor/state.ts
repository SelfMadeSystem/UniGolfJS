import { atom } from "nanostores";
import type { Placeable } from "./placeables";

export const $selectedPlaceable = atom<Placeable | null>(null);
