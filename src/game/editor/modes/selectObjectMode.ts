import { LevelObject } from "@/game/objects/levelObject";
import type { PointerInfo } from "@/render/pointerEvents";
import type { EditManager } from "../editManager";
import type { InteractionMode } from "./interactionMode";

export class SelectObjectMode implements InteractionMode {
  constructor(
    private editManager: EditManager,
    public readonly targetClass: typeof LevelObject<any> | null,
    private readonly selectCb: (object: LevelObject<any>) => void,
    private readonly exitCb: () => void,
    private readonly restoreMode: InteractionMode,
  ) {}

  onEnter(): void {
    this.editManager.highlightedObject = null;
  }

  onExit(): void {
    this.editManager.highlightedObject = null;
    this.exitCb();
  }

  pointermove(info: PointerInfo): void {
    this.editManager.highlightedObject = this.getHoveredObject(info);
  }

  pointerup(_info: PointerInfo): void {}

  pointerdown(info: PointerInfo): void {
    const hoveredObject = this.getHoveredObject(info);
    if (!hoveredObject) return;

    this.selectCb(hoveredObject);
    this.cancel();
  }

  public cancel(): void {
    this.editManager.currentMode?.onExit?.();
    this.editManager.currentMode = this.restoreMode;
    this.editManager.currentMode?.onEnter?.();
  }

  private getHoveredObject(info: PointerInfo): LevelObject<any> | null {
    const scene = this.editManager.scene;
    const eligibleObjects = new Set(
      this.targetClass
        ? scene.objects.getByType(this.targetClass)
        : scene.objects.getByType(LevelObject),
    ) as Set<LevelObject<any>>;

    const worldPos = scene.screenToWorld(info.pos);

    for (const object of eligibleObjects) {
      if (object.isPointInside(worldPos)) {
        return object;
      }
    }

    return null;
  }
}
