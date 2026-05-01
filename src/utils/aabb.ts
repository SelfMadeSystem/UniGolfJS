import { lineLineIntersection } from "./line";
import { Vector2, type VecLike } from "./vec";

export class AABB {
  public readonly tl: Vector2;
  public readonly br: Vector2;

  constructor(a: VecLike, b: VecLike) {
    const vecA = new Vector2(a);
    const vecB = new Vector2(b);
    this.tl = new Vector2(Math.min(vecA.x, vecB.x), Math.min(vecA.y, vecB.y));
    this.br = new Vector2(Math.max(vecA.x, vecB.x), Math.max(vecA.y, vecB.y));
  }

  static fromCenterSize(center: VecLike, size: VecLike): AABB {
    const c = new Vector2(center);
    const s = new Vector2(size).mult(0.5);
    return new AABB(c.sub(s), c.add(s));
  }

  get top() {
    return this.tl.y;
  }

  get bottom() {
    return this.br.y;
  }

  get left() {
    return this.tl.x;
  }

  get right() {
    return this.br.x;
  }

  get width() {
    return this.right - this.left;
  }

  get height() {
    return this.bottom - this.top;
  }

  get size() {
    return new Vector2(this.width, this.height);
  }

  get tr() {
    return new Vector2(this.right, this.top);
  }

  get bl() {
    return new Vector2(this.left, this.bottom);
  }

  get center() {
    return this.tl.avg(this.br);
  }

  get edges() {
    return [
      [this.tl, this.tr],
      [this.tr, this.br],
      [this.br, this.bl],
      [this.bl, this.tl],
    ] as const;
  }

  intersects(other: AABB): boolean {
    return !(
      this.br.x < other.tl.x ||
      this.tl.x > other.br.x ||
      this.br.y < other.tl.y ||
      this.tl.y > other.br.y
    );
  }

  touches(other: AABB): boolean {
    return !(
      this.br.x <= other.tl.x ||
      this.tl.x >= other.br.x ||
      this.br.y <= other.tl.y ||
      this.tl.y >= other.br.y
    );
  }

  containsPoint(point: Vector2): boolean {
    return (
      point.x >= this.tl.x &&
      point.x <= this.br.x &&
      point.y >= this.tl.y &&
      point.y <= this.br.y
    );
  }

  containsAABB(other: AABB): boolean {
    return (
      other.tl.x >= this.tl.x &&
      other.br.x <= this.br.x &&
      other.tl.y >= this.tl.y &&
      other.br.y <= this.br.y
    );
  }

  expand(amount: number): AABB {
    return new AABB(
      this.tl.sub(new Vector2(amount, amount)),
      this.br.add(new Vector2(amount, amount)),
    );
  }

  expandVec(amount: Vector2): AABB {
    return new AABB(
      new Vector2(
        this.tl.x + Math.min(0, amount.x),
        this.tl.y + Math.min(0, amount.y),
      ),
      new Vector2(
        this.br.x + Math.max(0, amount.x),
        this.br.y + Math.max(0, amount.y),
      ),
    );
  }

  expandToInclude(point: Vector2): AABB {
    return new AABB(
      new Vector2(Math.min(this.tl.x, point.x), Math.min(this.tl.y, point.y)),
      new Vector2(Math.max(this.br.x, point.x), Math.max(this.br.y, point.y)),
    );
  }

  expandToIncludeAABB(other: AABB): AABB {
    return new AABB(
      new Vector2(
        Math.min(this.tl.x, other.tl.x),
        Math.min(this.tl.y, other.tl.y),
      ),
      new Vector2(
        Math.max(this.br.x, other.br.x),
        Math.max(this.br.y, other.br.y),
      ),
    );
  }

  scale(scalar: number): AABB {
    return new AABB(this.tl.mult(scalar), this.br.mult(scalar));
  }

  scaleVec(vec: Vector2): AABB {
    return new AABB(this.tl.mult(vec), this.br.mult(vec));
  }

  translate(vec: Vector2): AABB {
    return new AABB(this.tl.add(vec), this.br.add(vec));
  }

  lineIntersects(start: Vector2, end: Vector2): boolean {
    const lineAABB = new AABB(start, end);
    if (!this.intersects(lineAABB)) {
      return false;
    }

    // Check if either endpoint is inside the AABB
    if (this.containsPoint(start) || this.containsPoint(end)) {
      return true;
    }

    // Check for intersection with each edge of the AABB
    for (const [edgeStart, edgeEnd] of this.edges) {
      if (lineLineIntersection(start, end, edgeStart, edgeEnd)) {
        return true;
      }
    }

    return false;
  }

  fillRect(ctx: CanvasRenderingContext2D) {
    ctx.fillRect(this.left, this.top, this.width, this.height);
  }

  strokeRect(ctx: CanvasRenderingContext2D) {
    ctx.strokeRect(this.left, this.top, this.width, this.height);
  }

  pathRect(path: CanvasPath) {
    path.rect(this.left, this.top, this.width, this.height);
  }

  toString(): string {
    return `AABB(tl: ${this.tl.toString()}, br: ${this.br.toString()})`;
  }
}
