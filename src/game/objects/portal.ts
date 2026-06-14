import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import { CircleObject, CircleObjectSchema } from './circleObject';
import type { PathInfo } from './levelObject';
import type { RigidBody } from './rigidBody';
import { type RenderInfo, type RenderPass, pass } from '@/render/drawable';
import { getLevelConfig, getLevelScene } from '@/scenes/state';
import { blendColors } from '@/utils/colorUtils';
import { objectIdSchema, positiveNumberSchema, rgbSchema } from '@/utils/data';
import z from 'zod';

export const PortalSchema = CircleObjectSchema.extend({
  portalColor: rgbSchema.default('#a855f7'),
  portalOutlineColor: rgbSchema.default('#7c3aed'),
  portalAccentColor: rgbSchema.default('#e9d5ff'),
  radius: positiveNumberSchema.default(25),
  pairedPortalId: objectIdSchema.optional().meta({ ofType: 'portal' }),
});

export const EFFECT_TIME = 10; // frames

export class Portal extends CircleObject<typeof PortalSchema> {
  static override schema = PortalSchema;
  private effectTime: number = 0;
  private teleportedBodies = new Set<RigidBody>();

  constructor(options: z.input<typeof PortalSchema>) {
    super(options);
  }

  get isSolid(): boolean {
    return false;
  }

  override tick(): void {
    super.tick();
    if (this.effectTime > 0) {
      this.effectTime--;
    }

    for (const body of this.teleportedBodies) {
      if (this.intersectsRigidBody(body)) return;
      this.teleportedBodies.delete(body);
    }
  }

  override getPathInfo(): PathInfo {
    return {
      heightLayer: 0,
      outlineLayer: LAYERS.OBJECTS_1,
      fillLayer: LAYERS.OBJECTS_2,
      outlineColor: this.data.portalOutlineColor,
      fillColor: this.data.portalColor,
      height: 0,
      outline: getLevelConfig().outlineWidth,
    };
  }

  override *render(info: RenderInfo): Iterable<RenderPass> {
    yield* super.render(info);

    const { tickWithInterp } = info;

    // Add animated portal effect
    yield pass(LAYERS.OBJECTS_3, ctx => {
      const gradient = ctx.createRadialGradient(
        this.pos.x,
        this.pos.y,
        0,
        this.pos.x,
        this.pos.y,
        this.radius,
      );

      const t = tickWithInterp / 15;
      const c2 = this.data.portalAccentColor;
      const c1 = blendColors(
        this.data.portalColor + '00',
        c2,
        this.effectTime / EFFECT_TIME,
      );

      gradient.addColorStop(
        0,
        blendColors(c1, c2, Math.abs(((t + 1) % 2) - 1)),
      );
      gradient.addColorStop(
        t % 1,
        blendColors(c1, c2, Math.sign((t % 2) - 1) * 0.5 + 0.5),
      );
      gradient.addColorStop(1, blendColors(c1, c2, Math.abs((t % 2) - 1)));

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  override intersectsRigidBody(rigidBody: RigidBody): boolean {
    if (rigidBody.radius > this.radius) return false;
    return super.intersectsRigidBody(rigidBody);
  }

  private getPairedPortal(): Portal | null {
    if (!this.data.pairedPortalId) return null;

    const scene = getLevelScene();
    if (!scene) return null;

    const pairedObject = scene.objects.getById(this.data.pairedPortalId);
    if (!pairedObject || !(pairedObject instanceof Portal)) {
      console.warn(
        `Portal ${this.id} has invalid paired portal id ${this.data.pairedPortalId}`,
      );
      return null;
    }

    return pairedObject;
  }

  override onIntersects(rigidBody: RigidBody): void {
    if (
      rigidBody.velocity.length() === 0 ||
      this.teleportedBodies.has(rigidBody)
    )
      return;

    const pairedPortal = this.getPairedPortal();
    if (!pairedPortal) return;

    // Teleport the rigid body to the paired portal
    rigidBody.pos = pairedPortal.pos.add(
      rigidBody.pos.sub(this.pos).div(this.radius).mult(pairedPortal.radius),
    );
    rigidBody.prevPos = rigidBody.pos;

    // Set cooldown on the paired portal to prevent immediate return
    pairedPortal.effectTime = EFFECT_TIME;
    pairedPortal.teleportedBodies.add(rigidBody);
  }

  override reset(): void {
    super.reset();
    this.effectTime = 0;
    this.teleportedBodies.clear();
  }
}
registerLevelObject('portal', Portal);
