import type { IconifyIcon } from "@iconify/react";
import type { LevelObject } from "../objects/levelObject";
import { Wall } from "../objects/wall";
import { Water } from "../objects/water";
import { Boost } from "../objects/boost";
import { Ball } from "../objects/ball";
import { Tee } from "../objects/tee";
import { Hole } from "../objects/hole";
import { BreakableWall } from "../objects/breakableWall";

export type Placeable = {
  id: string;
  name: string;
  icon: IconifyIcon | string;
  clazz: typeof LevelObject<any>;
  props?: Record<string, unknown>; // can't be bothered to type this
  noSize?: boolean;
};

export function polys(placeable: Placeable): Placeable[] {
  const shapes = [
    "rectangle",
    "triangle",
    "quarterCircle",
    "inverseQuarterCircle",
    "circle",
  ] as const;
  return shapes.map((shape) => ({
    ...placeable,
    id: `${placeable.id}-${shape}`,
    name: `${placeable.name} (${shape})`,
    // TODO: figure something about regarding icons for different shapes
    props: {
      ...placeable.props,
      shape,
    },
  }));
}

export const placeables: Placeable[] = [
  ...polys({
    id: "wall",
    name: "Wall",
    icon: "ph:wall-light",
    clazz: Wall,
  }),
  ...polys({
    id: "water",
    name: "Water",
    icon: "ph:drop-light",
    clazz: Water,
  }),
  ...polys({
    id: "boost",
    name: "Boost",
    icon: "ph:rocket-light",
    clazz: Boost,
  }),
  ...polys({
    id: "breakable-wall-red",
    name: "Breakable Wall (Red)",
    icon: "ph:wall-light",
    clazz: BreakableWall,
    props: {
      wallColor: "#f00",
      wallOutlineColor: "#800000",
    }
  }),
  {
    id: "ball",
    name: "Ball",
    icon: "ph:soccer-ball-light",
    clazz: Ball,
    noSize: true,
  },
  {
    id: "tee",
    name: "Tee",
    icon: "ph:golf",
    clazz: Tee,
    noSize: true,
  },
  {
    id: "hole",
    name: "Hole",
    icon: "ph:flag-light",
    clazz: Hole,
    noSize: true,
  },
];
