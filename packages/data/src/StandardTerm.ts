import { authenticated, date, entity, text, uuid } from '@microsoft/rayfin-core';

import { staffOnly } from './access.js';

/**
 * 표준 용어: a business term built from standard words, with its definition.
 *
 * Everyone signed in can read; only staff can add, change or remove entries.
 */
@entity()
@authenticated('read')
@authenticated('create', { policy: (claims) => staffOnly(claims) })
@authenticated('update', { policy: (claims) => staffOnly(claims) })
@authenticated('delete', { policy: (claims) => staffOnly(claims) })
export class StandardTerm {
  @uuid() id!: string;
  @text({ min: 1, max: 200 }) name!: string;
  @text({ optional: true, max: 100 }) abbreviation?: string;
  @text({ min: 1, max: 2000 }) definition!: string;
  @text({ min: 1, max: 100 }) category!: string;
  @text({ optional: true, max: 500 }) relatedWords?: string;
  @date() updatedAt!: Date;
  @text({ max: 254 }) updatedBy!: string;
}
