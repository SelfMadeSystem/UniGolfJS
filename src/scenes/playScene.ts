import { LevelScene } from "./levelScene";
import { RigidBody } from "@/game/objects/rigidBody";
import { PlayMenu } from "@/ui/PlayMenu";

export class PlayScene extends LevelScene {
  override get playing() {
    return true;
  }

  override get ui() {
    return PlayMenu;
  }

  override tick(): void {
    RigidBody.beginFrame();
    for (const obj of this.objects) {
      obj.tick();
    }

    super.tick();
  }
}
