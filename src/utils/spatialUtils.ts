import type { LevelObject } from "@/game/objects/levelObject";
import RBush, { type BBox } from "rbush";

/**
 * A cluster of spatially adjacent items.
 * This is used to group items that are touching or overlapping into a single.
 */
export class Cluster<T extends LevelObject<any>> {
  private static nextId = 0;
  public readonly id: number = Cluster.nextId++;
  public readonly items: Set<T> = new Set();

  constructor(initialItem: T) {
    this.items.add(initialItem);
  }

  add(item: T) {
    this.items.add(item);
  }

  has(item: T): boolean {
    return this.items.has(item);
  }

  delete(item: T) {
    this.items.delete(item);
  }

  clear() {
    this.items.clear();
  }

  merge(other: Cluster<T>) {
    for (const item of other.items) {
      this.items.add(item);
    }
  }
}

export class MyRBush<T extends LevelObject<any>> extends RBush<T> {
  public clusters: Set<Cluster<T>> = new Set();
  public itemToCluster: Map<T, Cluster<T>> = new Map();

  override insert(item: T): RBush<T> {
    const searchBBox = this.toBBox(item);
    const nearbyItems = this.search(searchBBox);

    let cluster: Cluster<T> | null = null;
    for (const nearbyItem of nearbyItems) {
      const nearbyCluster = this.itemToCluster.get(nearbyItem);
      if (nearbyCluster) {
        if (!cluster) {
          cluster = nearbyCluster;
        } else if (cluster !== nearbyCluster) {
          cluster.merge(nearbyCluster);
          for (const mergedItem of nearbyCluster.items) {
            this.itemToCluster.set(mergedItem, cluster);
          }
          this.clusters.delete(nearbyCluster);
        }
      }
    }

    if (!cluster) {
      cluster = new Cluster(item);
      this.clusters.add(cluster);
    } else {
      cluster.add(item);
    }
    this.itemToCluster.set(item, cluster);

    return super.insert(item);
  }

  override remove(item: T): RBush<T> {
    if (!item) return this;
    const result = super.remove(item);
    const cluster = this.itemToCluster.get(item);
    if (cluster) {
      cluster.delete(item);
      this.itemToCluster.delete(item);
      this.clusters.delete(cluster);
      if (cluster.items.size > 0) {
        this.rebuildCluster(cluster);
      }
    }
    return result;
  }

  private rebuildCluster(brokenCluster: Cluster<T>) {
    // 1. Gather all items that were part of the old cluster
    const itemsToRecluster = Array.from(brokenCluster.items);

    // 2. Remove the old cluster completely from our tracking
    this.clusters.delete(brokenCluster);
    for (const item of itemsToRecluster) {
      this.itemToCluster.delete(item);
    }

    // 3. Use a Set to keep track of items we haven't assigned to a new cluster yet
    const unvisited = new Set(itemsToRecluster);

    for (const item of itemsToRecluster) {
      if (!unvisited.has(item)) continue;

      // Create a brand new cluster for this connected component
      const newCluster = new Cluster<T>(item);
      this.clusters.add(newCluster);

      // BFS / Flood-fill to find all structurally connected items
      const queue: T[] = [item];
      unvisited.delete(item);
      this.itemToCluster.set(item, newCluster);

      while (queue.length > 0) {
        const current = queue.shift()!;

        // Find spatial neighbors *only* within our pool of original cluster items
        const searchBBox = this.toBBox(current);
        const neighbors = this.search(searchBBox);

        for (const neighbor of neighbors) {
          // If it's a neighbor that belonged to the old cluster and hasn't been visited yet
          if (unvisited.has(neighbor)) {
            unvisited.delete(neighbor);
            newCluster.add(neighbor);
            this.itemToCluster.set(neighbor, newCluster);
            queue.push(neighbor);
          }
        }
      }
    }
  }

  searchCluster(bbox: BBox): Set<Cluster<T>> {
    const nearbyItems = this.search(bbox);
    const nearbyClusters = new Set<Cluster<T>>();
    for (const item of nearbyItems) {
      const cluster = this.itemToCluster.get(item);
      if (cluster) {
        nearbyClusters.add(cluster);
      }
    }
    return nearbyClusters;
  }

  override toBBox(item: T): BBox {
    return item.getAABB();
  }

  override compareMinX(a: T, b: T): number {
    return a.getAABB().minX - b.getAABB().minX;
  }

  override compareMinY(a: T, b: T): number {
    return a.getAABB().minY - b.getAABB().minY;
  }
}

export class SpatialHashGrid<T extends LevelObject<any>> {
  private cellSize: number;
  private grid: Map<string, Set<T>> = new Map();
  private itemToCells: Map<T, Set<string>> = new Map();

  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }

  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private *getKeysForAABB(aabb: BBox): Iterable<string> {
    const minCellX = Math.floor(aabb.minX / this.cellSize);
    const maxCellX = Math.floor(aabb.maxX / this.cellSize);
    const minCellY = Math.floor(aabb.minY / this.cellSize);
    const maxCellY = Math.floor(aabb.maxY / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        yield this.getCellKey(x, y);
      }
    }
  }

  insert(item: T): void {
    if (this.itemToCells.has(item)) {
      this.update(item);
      return;
    }
    const aabb = item.getAABB();
    const keys = Array.from(this.getKeysForAABB(aabb));
    this.itemToCells.set(item, new Set(keys));

    for (const key of keys) {
      if (!this.grid.has(key)) {
        this.grid.set(key, new Set());
      }
      this.grid.get(key)!.add(item);
    }

    item.onAabbChange(() => this.update(item));
  }

  remove(item: T): void {
    const keys = this.itemToCells.get(item);
    if (!keys) return;

    for (const key of keys) {
      const cell = this.grid.get(key);
      if (cell) {
        cell.delete(item);
        if (cell.size === 0) {
          this.grid.delete(key);
        }
      }
    }
    this.itemToCells.delete(item);
  }

  update(item: T): void {
    const oldKeys = this.itemToCells.get(item);
    if (!oldKeys) {
      this.insert(item);
      return;
    }

    const aabb = item.getAABB();
    const newKeys = new Set(Array.from(this.getKeysForAABB(aabb)));
    this.itemToCells.set(item, newKeys);

    // Remove from old cells that are no longer occupied
    for (const key of oldKeys) {
      if (!newKeys.has(key)) {
        const cell = this.grid.get(key);
        if (cell) {
          cell.delete(item);
          if (cell.size === 0) {
            this.grid.delete(key);
          }
        }
      }
    }

    // Add to new cells that weren't previously occupied
    for (const key of newKeys) {
      if (!oldKeys.has(key)) {
        if (!this.grid.has(key)) {
          this.grid.set(key, new Set());
        }
        this.grid.get(key)!.add(item);
      }
    }
  }

  query(aabb: BBox): Set<T> {
    const keys = Array.from(this.getKeysForAABB(aabb));
    const results = new Set<T>();
    for (const key of keys) {
      const cell = this.grid.get(key);
      if (cell) {
        for (const item of cell) {
          results.add(item);
        }
      }
    }
    return results;
  }
}
