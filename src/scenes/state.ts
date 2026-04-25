import { MenuScene } from "@/scenes/menuScene";
import { Scene } from "@/scenes/scene";
import { atom } from "nanostores";

export const $scene = atom<Scene>(new MenuScene());
