import { MainMenu } from "@/ui/MainMenu";
import { Scene } from "./scene";

export class MenuScene extends Scene {
  override get ui() {
    return MainMenu;
  }
  override tick(): void {
  }
}