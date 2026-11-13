import { authenticated, date, entity, text, uuid } from '@microsoft/rayfin-core';

import { staffOnly } from './access.js';

/**
 * 표준 단어: a word or abbreviation and its formal name (for example DWT, Deadweight Tonnage).
 *
 * Everyone signed in can read the dictionary; only staff can add, change or remove entries.
 */
@entity()
@authenticated('read')
@authenticated('create', { policy: (claims) => staffOnly(claims) })
@authenticated('update', { policy: (claims) => staffOnly(claims) })
@authenticated('delete', { policy: (claims) => staffOnly(claims) })
export class StandardWord {
  @uuid() id!: string;
  @text({ min: 1, max: 100 }) word!: string;
  @text({ optional: true, max: 200 }) formalName?: string;
  @text({ optional: true, max: 1000 }) description?: string;
  @text({ min: 1, max: 100 }) category!: string;
  @date() updatedAt!: Date;
  @text({ max: 254 }) updatedBy!: string;
}
