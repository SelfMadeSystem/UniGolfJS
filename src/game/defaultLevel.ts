import { type Level, defaultLevelConfig } from './levelConfig';
import { Hole } from './objects/hole';
import { Tee } from './objects/tee';
import { Wall } from './objects/wall';
import { Vec2Schema } from '@/utils/data';
import { Vector2 } from '@/utils/vec';

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
        cameraTl: new Vector2(-200, -500),
        cameraBr: new Vector2(200, 100),
      }),
    ],
    config: defaultLevelConfig,
  };
}
