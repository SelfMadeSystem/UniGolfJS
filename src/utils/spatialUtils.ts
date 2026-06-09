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

export class LevelObjectRBush<T extends LevelObject<any>> extends RBush<T> {
  // cache the AABBs because otherwise, removing items from the RBush doesn't
  // remove the old AABB if the item's position has changed since it was inserted
  private readonly itemAabbCache: Map<T, BBox> = new Map();

  override toBBox(item: T): BBox {
    if (this && this.itemAabbCache.has(item)) {
      return this.itemAabbCache.get(item)!;
    }
    return item.getAABB();
  }

  override compareMinX(a: T, b: T): number {
    return this
      ? this.toBBox(a).minX - this.toBBox(b).minX
      : a.getAABB().minX - b.getAABB().minX;
  }

  override compareMinY(a: T, b: T): number {
    return this
      ? this.toBBox(a).minY - this.toBBox(b).minY
      : a.getAABB().minY - b.getAABB().minY;
  }

  override insert(item: T): RBush<T> {
    if (this.itemAabbCache.has(item)) {
      console.warn("Inserting item that already exists in RBush:", item);
    }
    this.itemAabbCache.set(item, item.getAABB());
    return super.insert(item);
  }

  override remove(item: T): RBush<T> {
    const r = super.remove(item);
    this.itemAabbCache.delete(item);
    return r;
  }

  override clear(): RBush<T> {
    this.itemAabbCache?.clear();
    return super.clear();
  }

  update(item: T): void {
    this.remove(item);
    this.insert(item);
  }
}

export class ClusteredRBush<
  T extends LevelObject<any>,
> extends LevelObjectRBush<T> {
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
}
