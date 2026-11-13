import { DataRequest } from './DataRequest.js';
import { RequestComment } from './RequestComment.js';
import { StandardFormula } from './StandardFormula.js';
import { StandardTerm } from './StandardTerm.js';
import { StandardWord } from './StandardWord.js';
import type { UniversalAppSchema } from '@rayfin-app/shared';

/**
 * The app's Rayfin data schema.
 *
 * `UniversalAppSchema` in `@rayfin-app/shared` is what makes
 * `(await getRayfinClient()).data.<Entity>` typed, so keep it in step with `schema`
 * below: a class registered in `schema` but missing from the shared type is
 * reachable at runtime and invisible to the compiler.
 *
 * To add an entity: declare it as a decorated class next to `DataRequest.ts`, export it
 * here, add its record contract to `@rayfin-app/shared`, and register it in the
 * array. Every entity needs explicit access control; see the `data-modeling` skill.
 */
export type { UniversalAppSchema };
export { DataRequest, RequestComment, StandardFormula, StandardTerm, StandardWord };

export const schema = [DataRequest, RequestComment, StandardWord, StandardTerm, StandardFormula];
