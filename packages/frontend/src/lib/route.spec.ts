import { describe, expect, it } from 'vitest';

import { DEFAULT_ROUTE, isStandardView, parseHash, routeToHash } from './route';

const ID = 'a1b2c3d4-0000-4000-8000-000000000001';

describe('parseHash', () => {
  it('opens the request list by default', () => {
    expect(parseHash('')).toEqual(DEFAULT_ROUTE);
    expect(parseHash('#')).toEqual(DEFAULT_ROUTE);
    expect(parseHash('#something-else')).toEqual(DEFAULT_ROUTE);
  });

  it('reads a request link', () => {
    expect(parseHash(`#request=${ID}`)).toEqual({ view: 'requests', requestId: ID });
  });

  it('ignores request ids that are not ids', () => {
    expect(parseHash('#request=../../etc')).toEqual(DEFAULT_ROUTE);
    expect(parseHash('#request=')).toEqual(DEFAULT_ROUTE);
    expect(parseHash('#request=%E0%A4%A')).toEqual(DEFAULT_ROUTE);
  });

  it('reads the three dictionary screens and rejects unknown ones', () => {
    expect(parseHash('#standards=words')).toEqual({ view: 'words', requestId: null });
    expect(parseHash('#standards=terms')).toEqual({ view: 'terms', requestId: null });
    expect(parseHash('#standards=formulas')).toEqual({ view: 'formulas', requestId: null });
    expect(parseHash('#standards=admin')).toEqual(DEFAULT_ROUTE);
  });
});

describe('routeToHash', () => {
  it('round-trips every route', () => {
    for (const route of [
      DEFAULT_ROUTE,
      { view: 'requests' as const, requestId: ID },
      { view: 'words' as const, requestId: null },
      { view: 'terms' as const, requestId: null },
      { view: 'formulas' as const, requestId: null },
    ]) {
      expect(parseHash(routeToHash(route))).toEqual(route);
    }
  });

  it('knows which views are dictionaries', () => {
    expect(isStandardView('words')).toBe(true);
    expect(isStandardView('requests')).toBe(false);
  });
});
