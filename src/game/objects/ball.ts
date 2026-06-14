import { LAYERS } from '../levelConfig';
import { registerLevelObject } from '../levelObjectRegistry';
import type { PathInfo } from './levelObject';
import { RigidBody, RigidBodySchema } from './rigidBody';
import { rgbSchema } from '@/utils/data';
import type z from 'zod';

export const BallSchema = RigidBodySchema.extend({
  color: rgbSchema.default('#fff'),
});

export class Ball extends RigidBody<typeof BallSchema> {
  static override schema = BallSchema;

  constructor(options: z.input<typeof BallSchema>) {
    super(options);
  }

  getPathInfo(): PathInfo {
    return {
      outlineLayer: LAYERS.BALL,
      fillLayer: LAYERS.BALL,
      outlineColor: '#000',
      fillColor: this.data.color,
      height: 4,
      outline: 2,
    };
  }
}
registerLevelObject('ball', Ball);
