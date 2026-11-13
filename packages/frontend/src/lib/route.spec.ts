import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ROUTE,
  isDashboardView,
  isStandardView,
  parseHash,
  routeToHash,
  VIEW_LABEL,
  VIEWS,
} from './route';

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

  it('reads the two dashboards and rejects unknown ones', () => {
    expect(parseHash('#dashboards=lng')).toEqual({ view: 'lng', requestId: null });
    expect(parseHash('#dashboards=sales')).toEqual({ view: 'sales', requestId: null });
    expect(parseHash('#dashboards=words')).toEqual(DEFAULT_ROUTE);
    expect(parseHash('#dashboards=')).toEqual(DEFAULT_ROUTE);
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
      { view: 'lng' as const, requestId: null },
      { view: 'sales' as const, requestId: null },
    ]) {
      expect(parseHash(routeToHash(route))).toEqual(route);
    }
  });

  it('knows which views are dictionaries', () => {
    expect(isStandardView('words')).toBe(true);
    expect(isStandardView('requests')).toBe(false);
    expect(isStandardView('lng')).toBe(false);
    expect(isDashboardView('lng')).toBe(true);
    expect(isDashboardView('words')).toBe(false);
  });

  it('has a label for every screen', () => {
    for (const view of VIEWS) expect(VIEW_LABEL[view].length, view).toBeGreaterThan(0);
    expect(VIEW_LABEL.lng).toBe('LNG 수출입 현황');
    expect(VIEW_LABEL.sales).toBe('판매 현황');
  });
});
