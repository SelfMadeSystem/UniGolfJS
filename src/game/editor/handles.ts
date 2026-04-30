import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";
import { AABB } from "@/utils/aabb";
import { Vector2 } from "@/utils/vec";
import { LAYERS } from "../levelConfig";
import type { EditScene } from "@/scenes/editScene";
import { icons as mdiIcons } from "@iconify-json/mdi";

export type HandleAction = "resize" | "rotateCW" | "rotateCCW" | "delete";

export abstract class EditorHandle {
  constructor(public scene: EditScene) {}
  abstract contains(pointerPos: Vector2, selectionAABB: AABB): boolean;
  abstract render(selectionAABB: AABB, info: RenderInfo): Iterable<RenderPass>;
  abstract cursor(): string;
  abstract action(): HandleAction;
}

type IconName = keyof typeof mdiIcons.icons;

const iconCache = new Map<IconName, HTMLImageElement>();

function getIconImage(iconName: IconName): HTMLImageElement | null {
  const cached = iconCache.get(iconName);
  if (cached) {
    if (cached.complete && cached.naturalWidth > 0) return cached;
    return null;
  }

  const icon = mdiIcons.icons[iconName];
  if (!icon) return null;

  const image = new Image();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${mdiIcons.width} ${mdiIcons.height}">${icon.body}</svg>`;
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  iconCache.set(iconName, image);
  return null;
}

function drawIcon(
  ctx: CanvasRenderingContext2D,
  iconName: IconName,
  aabb: AABB,
  color: string,
) {
  const image = getIconImage(iconName);
  if (!image) return;

  const pad = Math.max(1, Math.min(aabb.width, aabb.height) * 0.15);
  ctx.save();
  ctx.fillStyle = color;
  ctx.drawImage(
    image,
    aabb.tl.x + pad,
    aabb.tl.y + pad,
    aabb.width - pad * 2,
    aabb.height - pad * 2,
  );
  ctx.restore();
}

class ResizeHandle extends EditorHandle {
  static readonly SIZE_PX = 14;

  private getAABB(selectionAABB: AABB) {
    const handleSize = ResizeHandle.SIZE_PX / this.scene.cameraZoom;
    return new AABB(
      selectionAABB.br,
      selectionAABB.br.add(new Vector2(handleSize)),
    );
  }

  contains(pointerPos: Vector2, selectionAABB: AABB) {
    return this.getAABB(selectionAABB).containsPoint(pointerPos);
  }

  *render(selectionAABB: AABB, info: RenderInfo) {
    const aabb = this.getAABB(selectionAABB);
    yield pass(LAYERS.EDITOR, (ctx) => {
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(
        aabb.tl.x,
        aabb.tl.y,
        aabb.br.x - aabb.tl.x,
        aabb.br.y - aabb.tl.y,
      );
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.setLineDash([]);
      ctx.strokeRect(
        aabb.tl.x,
        aabb.tl.y,
        aabb.br.x - aabb.tl.x,
        aabb.br.y - aabb.tl.y,
      );
      drawIcon(ctx, "arrow-top-left-bottom-right", aabb, "#111111");
      ctx.restore();
    });
  }

  cursor() {
    return "nwse-resize";
  }

  action(): HandleAction {
    return "resize";
  }
}

class RotateHandle extends EditorHandle {
  static readonly SIZE_PX = 14;
  constructor(
    scene: EditScene,
    public corner: "tr" | "bl",
  ) {
    super(scene);
  }

  private getAABB(selectionAABB: AABB) {
    switch (this.corner) {
      case "tr": {
        const handleSize = RotateHandle.SIZE_PX / this.scene.cameraZoom;
        return new AABB(
          selectionAABB.tr,
          selectionAABB.tr.add(new Vector2(handleSize, -handleSize)),
        );
      }
      case "bl": {
        const handleSize = RotateHandle.SIZE_PX / this.scene.cameraZoom;
        return new AABB(
          selectionAABB.bl,
          selectionAABB.bl.add(new Vector2(-handleSize, handleSize)),
        );
      }
    }
  }

  contains(pointerPos: Vector2, selectionAABB: AABB) {
    return this.getAABB(selectionAABB).containsPoint(pointerPos);
  }

  *render(selectionAABB: AABB, info: RenderInfo) {
    const aabb = this.getAABB(selectionAABB);
    yield pass(LAYERS.EDITOR, (ctx) => {
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(
        aabb.tl.x,
        aabb.tl.y,
        aabb.br.x - aabb.tl.x,
        aabb.br.y - aabb.tl.y,
      );
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        aabb.tl.x,
        aabb.tl.y,
        aabb.br.x - aabb.tl.x,
        aabb.br.y - aabb.tl.y,
      );
      drawIcon(
        ctx,
        this.corner === "tr" ? "rotate-left" : "rotate-right",
        aabb,
        "#111111",
      );
      ctx.restore();
    });
  }

  cursor() {
    return "pointer";
  }

  action(): HandleAction {
    return this.corner === "tr" ? "rotateCCW" : "rotateCW";
  }
}

class DeleteHandle extends EditorHandle {
  static readonly SIZE_PX = 14;

  private getAABB(selectionAABB: AABB) {
    const handleSize = DeleteHandle.SIZE_PX / this.scene.cameraZoom;
    return new AABB(
      selectionAABB.tl.sub(new Vector2(handleSize)),
      selectionAABB.tl,
    );
  }

  contains(pointerPos: Vector2, selectionAABB: AABB) {
    return this.getAABB(selectionAABB).containsPoint(pointerPos);
  }

  *render(selectionAABB: AABB, info: RenderInfo) {
    const aabb = this.getAABB(selectionAABB);
    yield pass(LAYERS.EDITOR, (ctx) => {
      ctx.save();
      ctx.fillStyle = "#FF5555";
      ctx.fillRect(
        aabb.tl.x,
        aabb.tl.y,
        aabb.br.x - aabb.tl.x,
        aabb.br.y - aabb.tl.y,
      );
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        aabb.tl.x,
        aabb.tl.y,
        aabb.br.x - aabb.tl.x,
        aabb.br.y - aabb.tl.y,
      );
      drawIcon(ctx, "close", aabb, "#111111");
      ctx.restore();
    });
  }

  cursor() {
    return "pointer";
  }

  action(): HandleAction {
    return "delete";
  }
}

export class HandlesManager {
  private resize: ResizeHandle;
  private rotateTR: RotateHandle;
  private rotateBL: RotateHandle;
  private delete: DeleteHandle;

  constructor(public scene: EditScene) {
    this.resize = new ResizeHandle(scene);
    this.rotateTR = new RotateHandle(scene, "tr");
    this.rotateBL = new RotateHandle(scene, "bl");
    this.delete = new DeleteHandle(scene);
  }

  hitTest(pointerPos: Vector2, selectionAABB: AABB): EditorHandle | null {
    if (this.resize.contains(pointerPos, selectionAABB)) return this.resize;
    if (this.rotateTR.contains(pointerPos, selectionAABB)) return this.rotateTR;
    if (this.rotateBL.contains(pointerPos, selectionAABB)) return this.rotateBL;
    if (this.delete.contains(pointerPos, selectionAABB)) return this.delete;
    return null;
  }

  *render(selectionAABB: AABB, info: RenderInfo): Iterable<RenderPass> {
    yield* this.resize.render(selectionAABB, info);
    yield* this.rotateTR.render(selectionAABB, info);
    yield* this.rotateBL.render(selectionAABB, info);
    yield* this.delete.render(selectionAABB, info);
  }
}
