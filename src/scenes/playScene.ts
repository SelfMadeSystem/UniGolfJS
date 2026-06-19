import { LevelScene } from './levelScene';
import type { Level } from '@/game/levelConfig';
import { stepPhysics } from '@/game/physics';
import { markFpsTick } from '@/stores/fpsChart';
import { PlayMenu } from '@/ui/PlayMenu';

export class PlayScene extends LevelScene {
  constructor(level: Level) {
    super(level);
    const { stateStack } = level;

    if (stateStack.length > 0) {
      this.loadInitialState();
    } else {
      this.saveState();
    }
    this.sceneReset();
  }

  override get playing() {
    return true;
  }

  override get ui() {
    return PlayMenu;
  }

  override tick(): void {
    for (const obj of this.objects) {
      obj.tick();
    }
    stepPhysics(this);
    markFpsTick();

    super.tick();
  }
}
