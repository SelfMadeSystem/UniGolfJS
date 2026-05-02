import type { IconifyIcon } from "@iconify/react";
import type { LevelObject } from "../objects/levelObject";
import { Wall } from "../objects/wall";
import { Water } from "../objects/water";
import { Boost } from "../objects/boost";
import { Ball } from "../objects/ball";
import { Tee } from "../objects/tee";
import { Hole } from "../objects/hole";
import { BreakableWall } from "../objects/breakableWall";
import { Slope } from "../objects/slope";
import { BouncyWall } from "../objects/bouncyWall";
import { ConveyorBelt } from "../objects/conveyorBelt";
import { Portal } from "../objects/portal";
import { rgbSchema } from "@/utils/data";

type Shape =
  | "rectangle"
  | "triangle"
  | "quarterCircle"
  | "inverseQuarterCircle"
  | "circle";

type PlaceableBase = {
  id: string;
  name: string;
  icon: IconifyIcon | string;
  iconColor?: string;
  props?: Record<string, unknown>; // can't be bothered to type this
  noSize?: boolean;
};

export type Placeable = PlaceableBase & {
  clazz: typeof LevelObject<any>;
};

export type PlaceableGroup = {
  id: string;
  name: string;
  icon?: IconifyIcon | string;
  iconColor?: string;
  clazz: typeof LevelObject<any>;
  variations: PlaceableVariation[];
};

export type PlaceableVariation = Placeable | PlaceableGroup;

function createPlaceableGroup(
  group: Omit<PlaceableGroup, "variations">,
  variations: PlaceableVariation[],
): PlaceableGroup {
  return {
    ...group,
    variations,
  };
}

const shapeIcons: Record<Shape, IconifyIcon> = {
  rectangle: {
    body: '<rect fill="currentColor" x="2" y="2" width="12" height="12" rx="1" />',
    width: 16,
    height: 16,
  },
  triangle: {
    body: '<path fill="currentColor" d="M2 2L14 14H2Z" />',
    width: 16,
    height: 16,
  },
  quarterCircle: {
    body: '<path fill="currentColor" d="M2 2v12H2A12 12 0 0014 2Z" />',
    width: 16,
    height: 16,
  },
  inverseQuarterCircle: {
    body: '<path fill="currentColor" d="M14 2v12H2A12 12 0 0014 2Z" />',
    width: 16,
    height: 16,
  },
  circle: {
    body: '<circle fill="currentColor" cx="8" cy="8" r="6" />',
    width: 16,
    height: 16,
  },
};

function createShapeVariations(placeable: {
  id: string;
  name: string;
  clazz: typeof LevelObject<any>;
  iconColor?: string;
  props?: Record<string, unknown>;
}): Placeable[] {
  const shapes: Shape[] = [
    "rectangle",
    "triangle",
    "quarterCircle",
    "inverseQuarterCircle",
    "circle",
  ];
  return shapes.map((shape) => ({
    id: `${placeable.id}-${shape}`,
    name: `${placeable.name} (${shape})`,
    icon: shapeIcons[shape],
    iconColor: placeable.iconColor,
    clazz: placeable.clazz,
    props: {
      ...placeable.props,
      shape,
    },
  }));
}

function flattenPlaceableVariations(
  variations: PlaceableVariation[],
): Placeable[] {
  return variations.flatMap((variation) =>
    "variations" in variation
      ? flattenPlaceableVariations(variation.variations)
      : [variation],
  );
}

export const placeableGroups: PlaceableGroup[] = [
  createPlaceableGroup(
    {
      id: "wall",
      name: "Wall",
      icon: "ph:wall-light",
      clazz: Wall,
    },
    createShapeVariations({
      id: "wall",
      name: "Wall",
      clazz: Wall,
    }),
  ),
  createPlaceableGroup(
    {
      id: "water",
      name: "Water",
      icon: "ph:drop-light",
      clazz: Water,
    },
    createShapeVariations({
      id: "water",
      name: "Water",
      clazz: Water,
    }),
  ),
  createPlaceableGroup(
    {
      id: "boost",
      name: "Boost",
      icon: "ph:rocket-light",
      clazz: Boost,
    },
    createShapeVariations({
      id: "boost",
      name: "Boost",
      clazz: Boost,
    }),
  ),
  createPlaceableGroup(
    {
      id: "breakable-wall",
      name: "Breakable Wall",
      icon: "ph:wall-light",
      clazz: BreakableWall,
    },
    [
      createPlaceableGroup(
        {
          id: "breakable-wall-red",
          name: "Red",
          icon: "ph:wall-light",
          iconColor: "#ff0000",
          clazz: BreakableWall,
        },
        createShapeVariations({
          id: "breakable-wall-red",
          name: "Red",
          clazz: BreakableWall,
          iconColor: "#ff0000",
          props: {
            wallColor: "#ff0000",
            wallOutlineColor: "#800000",
          },
        }),
      ),
      createPlaceableGroup(
        {
          id: "breakable-wall-yellow",
          name: "Yellow",
          icon: "ph:wall-light",
          iconColor: "#ffcc00",
          clazz: BreakableWall,
        },
        createShapeVariations({
          id: "breakable-wall-yellow",
          name: "Yellow",
          clazz: BreakableWall,
          iconColor: "#ffcc00",
          props: {
            wallColor: "#ffcc00",
            wallOutlineColor: "#806600",
          },
        }),
      ),
      createPlaceableGroup(
        {
          id: "breakable-wall-green",
          name: "Green",
          icon: "ph:wall-light",
          iconColor: "#22c55e",
          clazz: BreakableWall,
        },
        createShapeVariations({
          id: "breakable-wall-green",
          name: "Green",
          clazz: BreakableWall,
          iconColor: "#22c55e",
          props: {
            wallColor: "#22c55e",
            wallOutlineColor: "#166534",
          },
        }),
      ),
      createPlaceableGroup(
        {
          id: "breakable-wall-blue",
          name: "Blue",
          icon: "ph:wall-light",
          iconColor: "#3b82f6",
          clazz: BreakableWall,
        },
        createShapeVariations({
          id: "breakable-wall-blue",
          name: "Blue",
          clazz: BreakableWall,
          iconColor: "#3b82f6",
          props: {
            wallColor: "#3b82f6",
            wallOutlineColor: "#1d4ed8",
          },
        }),
      ),
    ],
  ),
  createPlaceableGroup(
    {
      id: "ball",
      name: "Ball",
      icon: "ph:soccer-ball-light",
      clazz: Ball,
    },
    [
      {
        id: "ball",
        name: "Ball",
        icon: "ph:soccer-ball-light",
        clazz: Ball,
        noSize: true,
      },
    ],
  ),
  createPlaceableGroup(
    {
      id: "tee",
      name: "Tee",
      icon: "ph:golf",
      clazz: Tee,
    },
    [
      {
        id: "tee",
        name: "Tee",
        icon: "ph:golf",
        clazz: Tee,
        noSize: true,
      },
    ],
  ),
  createPlaceableGroup(
    {
      id: "hole",
      name: "Hole",
      icon: "ph:flag-light",
      clazz: Hole,
    },
    [
      {
        id: "hole",
        name: "Hole",
        icon: "ph:flag-light",
        clazz: Hole,
        noSize: true,
      },
    ],
  ),
  createPlaceableGroup(
    {
      id: "slope",
      name: "Slope",
      icon: "ph:ramp-light",
      iconColor: "#a67857",
      clazz: Slope,
    },
    createShapeVariations({
      id: "slope",
      name: "Slope",
      clazz: Slope,
      iconColor: "#a67857",
    }),
  ),
  createPlaceableGroup(
    {
      id: "bouncy-wall",
      name: "Bouncy Wall",
      icon: "ph:wall-light",
      iconColor: "#ff6b6b",
      clazz: BouncyWall,
    },
    createShapeVariations({
      id: "bouncy-wall",
      name: "Bouncy Wall",
      clazz: BouncyWall,
      iconColor: "#ff6b6b",
    }),
  ),
  createPlaceableGroup(
    {
      id: "conveyor-belt",
      name: "Conveyor Belt",
      icon: "ph:arrow-right-bold",
      iconColor: "#4a90e2",
      clazz: ConveyorBelt,
    },
    createShapeVariations({
      id: "conveyor-belt",
      name: "Conveyor Belt",
      clazz: ConveyorBelt,
      iconColor: "#4a90e2",
    }),
  ),
  createPlaceableGroup(
    {
      id: "portal",
      name: "Portal",
      icon: "ph:spiral-light",
      iconColor: "#a855f7",
      clazz: Portal,
    },
    [
      {
        id: "portal-purple",
        name: "Portal",
        icon: "ph:spiral-light",
        iconColor: "#a855f7",
        clazz: Portal,
        noSize: true,
        props: {
          portalColor: "#a855f7",
          portalOutlineColor: "#7c3aed",
          portalAccentColor: "#e9d5ff",
        },
      },
      {
        id: "portal-green",
        name: "Portal (Green)",
        icon: "ph:spiral-light",
        iconColor: "#22c55e",
        clazz: Portal,
        noSize: true,
        props: {
          portalColor: "#22c55e",
          portalOutlineColor: "#166534",
          portalAccentColor: "#bbf7d0",
        },
      },
      {
        id: "portal-blue",
        name: "Portal (Blue)",
        icon: "ph:spiral-light",
        iconColor: "#3b82f6",
        clazz: Portal,
        noSize: true,
        props: {
          portalColor: "#3b82f6",
          portalOutlineColor: "#1d4ed8",
          portalAccentColor: "#bfdbfe",
        },
      },
    ],
  ),
];

export const placeables: Placeable[] =
  flattenPlaceableVariations(placeableGroups);

export const defaultPlaceable = placeables[0]!;
