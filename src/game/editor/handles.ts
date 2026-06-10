import { LAYERS } from '../levelConfig';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import type { EditScene } from '@/scenes/editScene';
import { AABB } from '@/utils/aabb';
import { Vector2 } from '@/utils/vec';
import { icons as mdiIcons } from '@iconify-json/mdi';

export type HandleAction =
  | 'resize'
  | 'rotateCW'
  | 'rotateCCW'
  | 'delete'
  | 'copy';

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

  ctx.save();
  ctx.fillStyle = color;
  ctx.drawImage(image, aabb.tl.x, aabb.tl.y, aabb.width, aabb.height);
  ctx.restore();
}

class EditorHandle {
  static readonly SIZE_PX = 20;

  constructor(
    private scene: EditScene,
    private positionFn: (selectionAABB: AABB, handleSize: number) => AABB,
    private iconName: IconName,
    private fillColor: string,
    private cursorStyle: string,
    private handleAction: HandleAction,
  ) {}

  private getAABB(selectionAABB: AABB) {
    const handleSize = EditorHandle.SIZE_PX / this.scene.cameraZoom;
    return this.positionFn(selectionAABB, handleSize);
  }

  contains(pointerPos: Vector2, selectionAABB: AABB) {
    return this.getAABB(selectionAABB).containsPoint(pointerPos);
  }

  *render(selectionAABB: AABB, info: RenderInfo) {
    const aabb = this.getAABB(selectionAABB);
    yield pass(LAYERS.EDITOR, ctx => {
      ctx.save();
      ctx.fillStyle = this.fillColor;
      ctx.beginPath();
      ctx.roundRect(
        aabb.tl.x,
        aabb.tl.y,
        aabb.br.x - aabb.tl.x,
        aabb.br.y - aabb.tl.y,
        4 / this.scene.cameraZoom,
      );
      ctx.fill();
      drawIcon(ctx, this.iconName, aabb, '#111111');
      ctx.restore();
    });
  }

  cursor() {
    return this.cursorStyle;
  }

  action(): HandleAction {
    return this.handleAction;
  }
}

export class HandlesManager {
  private handles: EditorHandle[];

  constructor(public scene: EditScene) {
    this.handles = [
      new EditorHandle(
        scene,
        (aabb, size) => new AABB(aabb.br, aabb.br.add(new Vector2(size))),
        'arrow-top-left-bottom-right',
        '#FFFFFF',
        'nwse-resize',
        'resize',
      ),
      new EditorHandle(
        scene,
        (aabb, size) =>
          new AABB(aabb.tr, aabb.tr.add(new Vector2(size, -size))),
        'rotate-left',
        '#FFFFFF',
        'pointer',
        'rotateCCW',
      ),
      new EditorHandle(
        scene,
        (aabb, size) =>
          new AABB(aabb.bl, aabb.bl.add(new Vector2(-size, size))),
        'content-copy',
        '#FFFFFF',
        'pointer',
        'copy',
      ),
      new EditorHandle(
        scene,
        (aabb, size) => new AABB(aabb.tl.sub(new Vector2(size)), aabb.tl),
        'close',
        '#FF5555',
        'pointer',
        'delete',
      ),
    ];
  }

  hitTest(pointerPos: Vector2, selectionAABB: AABB): EditorHandle | null {
    for (const handle of this.handles) {
      if (handle.contains(pointerPos, selectionAABB)) return handle;
    }
    return null;
  }

  *render(selectionAABB: AABB, info: RenderInfo): Iterable<RenderPass> {
    for (const handle of this.handles) {
      yield* handle.render(selectionAABB, info);
    }
  }
}
