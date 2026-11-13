import { authenticated, date, entity, int, text, uuid } from '@microsoft/rayfin-core';

import { staffOnly } from './access.js';

/**
 * 표준 계산식: a named measure and how it is calculated (for example @Freight).
 *
 * Everyone signed in can read; only staff can add, change or remove entries.
 */
@entity()
@authenticated('read')
@authenticated('create', { policy: (claims) => staffOnly(claims) })
@authenticated('update', { policy: (claims) => staffOnly(claims) })
@authenticated('delete', { policy: (claims) => staffOnly(claims) })
export class StandardFormula {
  @uuid() id!: string;
  @text({ min: 1, max: 200 }) name!: string;
  @text({ optional: true, max: 200 }) title?: string;
  @text({ optional: true, max: 50 }) unit?: string;
  @text({ optional: true, max: 4000 }) expression?: string;
  @text({ optional: true, max: 2000 }) description?: string;
  @text({ optional: true, max: 1000 }) dependsOn?: string;
  @text({ optional: true, max: 1000 }) notes?: string;
  @text({ min: 1, max: 100 }) category!: string;
  @int({ min: 0, max: 8 }) depth!: number;
  @int({ min: 0, max: 1000000 }) sortOrder!: number;
  @date() updatedAt!: Date;
  @text({ max: 254 }) updatedBy!: string;
}
