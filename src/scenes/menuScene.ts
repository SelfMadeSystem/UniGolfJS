import { Scene } from './scene';
import { MainMenu } from '@/ui/MainMenu';

export class MenuScene extends Scene {
  override get ui() {
    return MainMenu;
  }
  override tick(): void {}
}
