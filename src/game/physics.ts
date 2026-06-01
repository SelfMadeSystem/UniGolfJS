import { Segment } from "@/utils/line";
import { Vector2 } from "@/utils/vec";
import { RigidBody } from "./objects/rigidBody";
import { PolyObject } from "./objects/polyObject";
import type { LevelScene } from "@/scenes/levelScene";

export type SimpleCollision = {
  normal: Vector2;
  step: number;
  overlap?: number;
};

export type RigidBodyInfo = {
  position: Vector2;
  velocity: Vector2;
  radius: number;
};

export function rigidBodyCollision(
  rba: RigidBodyInfo,
  rbb: RigidBodyInfo,
): SimpleCollision | null {
  // Move into the local space of A
  const relPos = rbb.position.sub(rba.position);
  const relVel = rbb.velocity.sub(rba.velocity);
  const radiusSum = rba.radius + rbb.radius;

  // Check if the circles are already overlapping
  const relPosLenSq = relPos.lenSq();
  if (relPosLenSq + 0.001 < radiusSum * radiusSum) {
    const relPosLen = Math.sqrt(relPosLenSq);
    const normal = relPos.div(relPosLen);
    const overlap = radiusSum - relPosLen;
    console.warn(`Overlap: ${overlap}`);
    return { normal, step: 0, overlap };
  }

  // Check if the circles are moving towards each other
  const velAlongNormal = relVel.dot(relPos.normalize());
  if (velAlongNormal >= 0) {
    return null; // No collision if they are moving apart
  }

  // Calculate the time of collision using quadratic formula
  const a = relVel.dot(relVel);
  const b = 2 * relPos.dot(relVel);
  const c = relPos.dot(relPos) - radiusSum * radiusSum;
  const discriminant = b * b - 4 * a * c;

  if (discriminant < 0) {
    return null; // No collision if the discriminant is negative
  }

  const sqrtDisc = Math.sqrt(discriminant);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);

  // We want the smallest positive time of collision
  const step = t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : null;
  if (step === null) {
    return null; // No collision within the time frame
  }

  // Calculate the normal at the point of collision
  const collisionPointA = rba.position.add(rba.velocity.mult(step));
  const collisionPointB = rbb.position.add(rbb.velocity.mult(step));
  const normal = collisionPointB.sub(collisionPointA).normalize();

  return { normal, step };
}

export function segmentCollision(
  { position, velocity, radius }: RigidBodyInfo,
  segment: Segment,
): SimpleCollision | null {
  const segDir = segment.normalizedDirection();
  const segNormal = segDir.cw90();
  let earliestCollision: SimpleCollision | null = null;

  // Check collision against the segment face.
  const relativePos = position.sub(segment.start);
  const velAlongNormal = velocity.dot(segNormal);
  const distAlongNormal = relativePos.dot(segNormal);

  if (velAlongNormal < 0) {
    const timeToCollision = (radius - distAlongNormal) / velAlongNormal;
    if (timeToCollision >= 0 && timeToCollision <= 1) {
      const collisionPoint = position.add(velocity.mult(timeToCollision));
      const segStartToCollision = collisionPoint.sub(segment.start);
      const projLength = segStartToCollision.dot(segDir);
      if (projLength >= 0 && projLength <= segment.length()) {
        earliestCollision = {
          normal: segNormal,
          step: timeToCollision,
        };
      }
    }
  }

  // Check collisions against both segment endpoints.
  const endpointCollision = (endpoint: Vector2) => {
    const a = velocity.lenSq();
    if (a === 0) return null;

    const relative = position.sub(endpoint);
    const b = 2 * relative.dot(velocity);
    const c = relative.lenSq() - radius * radius;
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;

    const sqrtDiscriminant = Math.sqrt(discriminant);
    const t1 = (-b - sqrtDiscriminant) / (2 * a);
    const t2 = (-b + sqrtDiscriminant) / (2 * a);
    const step = t1 >= 0 && t1 <= 1 ? t1 : t2 >= 0 && t2 <= 1 ? t2 : null;
    if (step === null) return null;

    const hit = position.add(velocity.mult(step));
    const normal = hit.sub(endpoint).normalize();
    if (velocity.dot(normal) >= 0) return null;

    return { normal, step };
  };

  const startCollision = endpointCollision(segment.start);
  if (
    startCollision &&
    (!earliestCollision || startCollision.step < earliestCollision.step)
  ) {
    earliestCollision = startCollision;
  }

  const endCollision = endpointCollision(segment.end);
  if (
    endCollision &&
    (!earliestCollision || endCollision.step < earliestCollision.step)
  ) {
    earliestCollision = endCollision;
  }

  return earliestCollision;
}

export function polyCollision(
  body: RigidBodyInfo,
  vertices: Vector2[],
): SimpleCollision | null {
  let earliestCollision: SimpleCollision | null = null;

  for (let i = 0; i < vertices.length; i++) {
    const start = vertices[i]!;
    const end = vertices[(i + 1) % vertices.length]!;
    const segment = new Segment(start, end);
    const collision = segmentCollision(body, segment);
    if (
      collision &&
      (!earliestCollision || collision.step < earliestCollision.step)
    ) {
      earliestCollision = collision;
    }
  }

  return earliestCollision;
}

export type RigidCollision = SimpleCollision & {
  kind: "rigid";
  objectA: RigidBody<any>;
  objectB: RigidBody<any>;
};

export type PolyCollision = SimpleCollision & {
  kind: "poly";
  body: RigidBody<any>;
  object: PolyObject<any>;
};

export type ObjectCollision = RigidCollision | PolyCollision;

export function getCollision(
  body: RigidBody,
  level: LevelScene,
): ObjectCollision | null {
  let earliestCollision: ObjectCollision | null = null;
  const aabb = body.getMovementAABB();
  const infoA = {
    position: body.pos,
    velocity: body.velocity,
    radius: body.radius,
  };

  for (const obj of level.objects.queryByAABB(aabb)) {
    if (obj === body) continue;

    let collision: ObjectCollision | null = null;
    if (obj instanceof RigidBody) {
      if (!body.getMovementAABB().intersects(obj.getMovementAABB())) continue;
      const infoB = {
        position: obj.pos,
        velocity: obj.velocity,
        radius: obj.radius,
      };
      const result = rigidBodyCollision(infoA, infoB);
      if (result) {
        collision = { ...result, objectA: body, objectB: obj, kind: "rigid" };
      }
    } else if (obj instanceof PolyObject) {
      if (!obj.isSolid) continue;
      if (!body.getMovementAABB().intersects(obj.getAABB())) continue;
      const result = polyCollision(infoA, obj.getPoints());
      if (result) {
        collision = { ...result, body, object: obj, kind: "poly" };
      }
    }

    if (
      collision &&
      (!earliestCollision || collision.step < earliestCollision.step)
    ) {
      earliestCollision = collision;
    }
  }

  return earliestCollision;
}

export function resolveCollision(collision: ObjectCollision): void {
  if (collision.kind === "rigid") {
    const { objectA, objectB, normal, overlap } = collision;

    if (overlap) {
      // Separate the objects to resolve overlap
      const totalRadius = objectA.radius + objectB.radius;
      const separationA = normal.mult((overlap * objectB.radius) / totalRadius);
      const separationB = normal.mult(
        (-overlap * objectA.radius) / totalRadius,
      );
      objectA.pos = objectA.pos.add(separationA);
      objectB.pos = objectB.pos.add(separationB);
      return;
    }

    const relativeVelocity = objectB.velocity.sub(objectA.velocity);
    const velAlongNormal = relativeVelocity.dot(normal);
    if (velAlongNormal > 0) return;

    const impulseMagnitude =
      (-2 * velAlongNormal) / (1 / objectA.radius + 1 / objectB.radius);
    const impulse = normal.mult(impulseMagnitude);

    objectA.velocity = objectA.velocity.sub(impulse.div(objectA.radius));
    objectB.velocity = objectB.velocity.add(impulse.div(objectB.radius));
  } else if (collision.kind === "poly") {
    const { body, normal, object } = collision;
    const velAlongNormal = body.velocity.dot(normal);
    if (velAlongNormal > 0) return;

    body.velocity = body.velocity.sub(normal.mult(2 * velAlongNormal));
    object.onCollision(body);
  }
}

export function stepPhysics(level: LevelScene): void {
  let timeRemaining = 1;
  let iteration = 0;

  while (timeRemaining > 0) {
    let earliestCollision: ObjectCollision | null = null;

    for (const obj of level.objects) {
      if (obj instanceof RigidBody && obj.velocity.lenSq() > 0) {
        const collision = getCollision(obj, level);
        if (
          collision &&
          collision.step <= timeRemaining &&
          (!earliestCollision || collision.step < earliestCollision.step)
        ) {
          earliestCollision = collision;
        }
      }
    }

    if (!earliestCollision) {
      // No collisions, move all objects by their full velocity
      for (const obj of level.objects) {
        if (obj instanceof RigidBody) {
          obj.pos = obj.pos.add(obj.velocity.mult(timeRemaining));
        }
      }
      break;
    }

    // Move all objects up to the point of collision
    const step = earliestCollision.step;
    for (const obj of level.objects) {
      if (obj instanceof RigidBody) {
        obj.set("pos", obj.pos.add(obj.velocity.mult(step)));
      }
    }

    // Resolve the collision
    resolveCollision(earliestCollision);

    timeRemaining -= step;
    iteration++;
    if (iteration > 10) {
      console.warn(
        "Too many collision iterations, breaking out to prevent infinite loop",
      );
      break;
    }
  }
}
