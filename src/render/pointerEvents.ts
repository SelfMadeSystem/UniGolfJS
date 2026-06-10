import type { Vector2 } from '@/utils/vec';

export type TouchPoint = {
  id: number;
  pos: Vector2;
};

export type PointerInfo<
  E extends PointerEvent | WheelEvent = PointerEvent | WheelEvent,
> = {
  pos: Vector2;
  leftButton: boolean;
  rightButton: boolean;
  middleButton: boolean;
  shift: boolean;
  ctrl: boolean;
  alt: boolean;
  event: E;
  eventType:
    | 'pointerdown'
    | 'pointermove'
    | 'pointerup'
    | 'pointerwheel'
    | 'touchstart'
    | 'touchmove'
    | 'touchend';
};

export interface PointerEventHandler {
  pointermove(info: PointerInfo<PointerEvent>): void;
  pointerup(info: PointerInfo<PointerEvent>): void;
  pointerdown(info: PointerInfo<PointerEvent>): void;
  // optional wheel handler for zooming
  pointerwheel?(info: PointerInfo<WheelEvent>): void;
}
