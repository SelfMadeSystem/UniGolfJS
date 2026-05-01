import z from "zod";
import { LAYERS, WALL_CONFIG } from "../levelConfig";
import type { PathInfo } from "./levelObject";
import type { RigidBody } from "./rigidBody";
import { CircleObject, CircleObjectSchema } from "./circleObject";
import { objectIdSchema, positiveNumberSchema, rgbSchema } from "@/utils/data";
import { registerLevelObject } from "../levelObjectRegistry";
import { getLevelScene } from "@/scenes/state";
import { blendColors } from "@/utils/colorUtils";
import { pass, type RenderInfo, type RenderPass } from "@/render/drawable";

export const PortalSchema = CircleObjectSchema.extend({
  portalColor: rgbSchema.default("#a855f7"),
  portalOutlineColor: rgbSchema.default("#7c3aed"),
  portalAccentColor: rgbSchema.default("#e9d5ff"),
  radius: positiveNumberSchema.default(25),
  pairedPortalId: objectIdSchema.optional().meta({ ofType: "portal" }),
});

const PORTAL_ANIMATION_SPEED = 0.05;

export class Portal extends CircleObject<typeof PortalSchema> {
  static override schema = PortalSchema;
  private portalAnimation: number = 0;
  private activationCooldown: number = 0;

  constructor(options: z.input<typeof PortalSchema>) {
    super(options);
  }

  get isSolid(): boolean {
    return false;
  }

  override tick(): void {
    super.tick();
    this.portalAnimation = (this.portalAnimation + PORTAL_ANIMATION_SPEED) % 1;
    if (this.activationCooldown > 0) {
      this.activationCooldown--;
    }
  }

  override getPathInfo(): PathInfo {
    return {
      shadowLayer: 0,
      heightLayer: 0,
      outlineLayer: LAYERS.OBJECTS_1,
      fillLayer: LAYERS.OBJECTS_2,
      outlineColor: this.data.portalOutlineColor,
      fillColor: this.data.portalColor,
      height: 0,
      outline: WALL_CONFIG.outline,
    };
  }

  override *render(info: RenderInfo): Iterable<RenderPass> {
    yield* super.render(info);

    // Add animated portal effect
    yield pass(LAYERS.OBJECTS_3, (ctx) => {
      const gradient = ctx.createRadialGradient(
        this.pos.x,
        this.pos.y,
        0,
        this.pos.x,
        this.pos.y,
        this.radius,
      );

      const t = this.portalAnimation;
      const c1 = this.data.portalColor;
      const c2 = this.data.portalAccentColor;

      gradient.addColorStop(
        0,
        blendColors(c1, c2, 0.5 + Math.sin(t * Math.PI * 2) * 0.5),
      );
      gradient.addColorStop(
        t,
        blendColors(c1, c2, Math.abs(Math.sin(t * Math.PI * 2))),
      );
      gradient.addColorStop(1, blendColors(c1, c2 + "33", 0.2));

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
    // Prevent immediate re-teleportation
    if (this.activationCooldown > 0) return;

    const pairedPortal = this.getPairedPortal();
    if (!pairedPortal) return;

    // Teleport the rigid body to the paired portal
    rigidBody.pos = pairedPortal.pos.add(
      pairedPortal.pos
        .sub(this.pos)
        .normalize()
        .mult(this.radius + 5),
    );
    rigidBody.prevPos = rigidBody.pos;

    // Set cooldown on the paired portal to prevent immediate return
    pairedPortal.activationCooldown = 15;
  }

  override reset(): void {
    super.reset();
    this.portalAnimation = 0;
    this.activationCooldown = 0;
  }
}
registerLevelObject("portal", Portal);
