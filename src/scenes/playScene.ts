import { LevelScene } from "./levelScene";
import { RigidBody } from "@/game/objects/rigidBody";
import { stepPhysics } from "@/game/physics";
import { PlayMenu } from "@/ui/PlayMenu";
import { markFpsTick } from "@/stores/fpsChart";

export class PlayScene extends LevelScene {
  override get playing() {
    return true;
  }

  override get ui() {
    return PlayMenu;
  }

  override tick(): void {
    stepPhysics(this);
    for (const obj of this.objects) {
      obj.tick();
    }
    markFpsTick();

    super.tick();
  }
}
