import type { LevelObject } from '../objects/levelObject';
import { type Placeable, defaultPlaceable } from './placeables';
import { EditScene } from '@/scenes/editScene';
import { $scene } from '@/scenes/state';
import { atom } from 'nanostores';

export const $selectedPlaceable = atom<Placeable>(defaultPlaceable);
export const $selectedObjects = atom<LevelObject[]>([]);
export const $copiedObjectProperties = atom<Record<string, unknown> | null>(
  null,
);

export function setSelectedPlaceable(placeable: Placeable) {
  $selectedPlaceable.set(placeable);
  const scene = $scene.get();
  if (!(scene instanceof EditScene)) return;

  scene.editManager.setMode('place');
  scene.editManager.selectedTool = 'place';
}

export function syncSelectedObjects(objects: Iterable<LevelObject>) {
  $selectedObjects.set([...objects]);
}

export function setCopiedObjectProperties(
  properties: Record<string, unknown> | null,
) {
  $copiedObjectProperties.set(properties);
}
