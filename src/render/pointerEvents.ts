import type { Vector2 } from "@/utils/vec";

export type PointerInfo = {
  pos: Vector2;
  leftButton: boolean;
  rightButton: boolean;
  middleButton: boolean;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  event: PointerEvent;
  eventType: "pointerdown" | "pointermove" | "pointerup";
};

export interface PointerEventHandler {
  pointermove(info: PointerInfo): void;
  pointerup(info: PointerInfo): void;
  pointerdown(info: PointerInfo): void;
}
