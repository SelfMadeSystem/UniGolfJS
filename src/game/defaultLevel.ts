import { Vector2 } from "@/utils/vec";
import { defaultLevelConfig, type Level } from "./levelConfig";
import { Wall } from "./objects/wall";
import { Tee } from "./objects/tee";
import { Hole } from "./objects/hole";

const width = 400;
const height = 600;
const wallThickness = 25;
const holeInset = 100;
const teeInset = 100;

export function defaultLevel(): Level {
  return {
    objects: [
      new Wall({
        position: new Vector2(0, -height / 2 + wallThickness / 2),
        scale: new Vector2(width, wallThickness),
      }),
      new Wall({
        position: new Vector2(0, height / 2 - wallThickness / 2),
        scale: new Vector2(width, wallThickness),
      }),
      new Wall({
        position: new Vector2(-width / 2 + wallThickness / 2, 0),
        scale: new Vector2(wallThickness, height),
      }),
      new Wall({
        position: new Vector2(width / 2 - wallThickness / 2, 0),
        scale: new Vector2(wallThickness, height),
      }),
      new Hole({
        position: new Vector2(0, -height / 2 + holeInset),
      }),
      new Tee({
        position: new Vector2(0, height / 2 - teeInset),
        active: true,
        cameraOffset: new Vector2(0, -(height / 2 - teeInset)),
      }),
    ],
    config: defaultLevelConfig,
  };
}
