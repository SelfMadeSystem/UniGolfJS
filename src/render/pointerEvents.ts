import type { Vector2 } from "@/utils/vec";

export type TouchPoint = {
  id: number;
  pos: Vector2;
};

export type PointerInfo = {
  pos: Vector2;
  leftButton: boolean;
  rightButton: boolean;
  middleButton: boolean;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  // underlying DOM event (PointerEvent, TouchEvent or WheelEvent)
  event: PointerEvent | TouchEvent | WheelEvent;
  eventType:
    | "pointerdown"
    | "pointermove"
    | "pointerup"
    | "pointerwheel"
    | "touchstart"
    | "touchmove"
    | "touchend";
};

export interface PointerEventHandler {
  pointermove(info: PointerInfo): void;
  pointerup(info: PointerInfo): void;
  pointerdown(info: PointerInfo): void;
  // optional wheel handler for zooming
  pointerwheel?(info: PointerInfo): void;
}
