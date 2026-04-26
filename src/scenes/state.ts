import { MenuScene } from "@/scenes/menuScene";
import { Scene } from "@/scenes/scene";
import { atom } from "nanostores";
import { PlayScene } from "./playScene";

export const $scene = atom<Scene>(new PlayScene());
