import { pass, type Drawable } from "@/render/drawable";
import { LAYERS } from "../levelConfig";
import type { EditScene } from "@/scenes/editScene";

export class EditorGrid implements Drawable {
  constructor(
    public gridSize: number,
    public scene: EditScene,
  ) {}

  *render() {
    if (this.gridSize <= 1) return;
    yield pass(LAYERS.FLOOR, (ctx) => {
      ctx.save();
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 0.5;
      const aabb = this.scene.getVisibleAABB();
      const startX = Math.floor(aabb.left / this.gridSize) * this.gridSize;
      const startY = Math.floor(aabb.top / this.gridSize) * this.gridSize;
      for (let x = startX; x < aabb.right; x += this.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, aabb.top);
        ctx.lineTo(x, aabb.bottom);
        ctx.stroke();
      }
      for (let y = startY; y < aabb.bottom; y += this.gridSize) {
        ctx.beginPath();
        ctx.moveTo(aabb.left, y);
        ctx.lineTo(aabb.right, y);
        ctx.stroke();
      }
      ctx.restore();
    });
  }
}
