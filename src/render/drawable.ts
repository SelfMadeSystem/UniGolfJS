export type RenderPass = {
  layer: number;
  draw: (ctx: CanvasRenderingContext2D) => void;
};

export type RenderInfo = {
  delta: number;
  tickInterp: number;
  tick: number;
  tickWithInterp: number;
};

export interface Drawable {
  render(info: RenderInfo): Iterable<RenderPass>;
}

export function pass(
  layer: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): RenderPass {
  return { layer, draw };
}

export function renderDrawables(
  drawables: Drawable[],
  info: RenderInfo,
  ctx: CanvasRenderingContext2D,
  passes: RenderPass[] = [],
) {
  const renderPasses: RenderPass[] = [];
  for (const drawable of drawables) {
    renderPasses.push(...drawable.render(info));
  }
  renderPasses.push(...passes);
  renderPasses.sort((a, b) => a.layer - b.layer);
  for (const pass of renderPasses) {
    pass.draw(ctx);
  }
}
