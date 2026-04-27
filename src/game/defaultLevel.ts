import { Vector2 } from "@/utils/vec";
import { type Level, defaultLevelConfig } from "./levelConfig";
import { Wall } from "./objects/wall";
import { Tee } from "./objects/tee";
import { Hole } from "./objects/hole";

const width = 400;
const height = 600;
const wallThickness = 20;

export function defaultLevel(): Level {
  return {
    config: defaultLevelConfig,
    objects: [
      new Wall({
        position: new Vector2(width / 2, wallThickness / 2),
        scale: new Vector2(width, wallThickness),
        ...defaultLevelConfig,
      }),
      new Wall({
        position: new Vector2(width / 2, height - wallThickness / 2),
        scale: new Vector2(width, wallThickness),
        ...defaultLevelConfig,
      }),
      new Wall({
        position: new Vector2(wallThickness / 2, height / 2),
        scale: new Vector2(wallThickness, height),
        ...defaultLevelConfig,
      }),
      new Wall({
        position: new Vector2(width - wallThickness / 2, height / 2),
        scale: new Vector2(wallThickness, height),
        ...defaultLevelConfig,
      }),
      new Tee({
        position: new Vector2(width / 2, height - 100),
        ...defaultLevelConfig,
      }),
      new Hole({
        position: new Vector2(width / 2, 100),
        ...defaultLevelConfig,
      }),
    ],
  };
}
