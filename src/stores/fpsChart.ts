import { atom } from "nanostores";

export const $fpsTickCounter = atom(0);

export function markFpsTick() {
  $fpsTickCounter.set($fpsTickCounter.get() + 1);
}
