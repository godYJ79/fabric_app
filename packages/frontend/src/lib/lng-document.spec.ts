import { describe, expect, it } from 'vitest';

import lngFragment from '@/dashboards/lng-trade-flow.html?raw';
import { buildLngDocument } from './lng-document';

describe('buildLngDocument', () => {
  it('renders in standards mode and carries the theme', () => {
    const light = buildLngDocument('<p>x</p>', false);
    expect(light.startsWith('<!doctype html>')).toBe(true);
    expect(light).toContain('data-theme="light"');
    expect(buildLngDocument('<p>x</p>', true)).toContain('data-theme="dark"');
  });

  it('keeps the supplied page exactly as it is', () => {
    expect(buildLngDocument(lngFragment, false)).toContain(lngFragment);
  });
});

describe('the supplied LNG dashboard', () => {
  it('still says its data is a sample, and names its map library source', () => {
    expect(lngFragment).toContain('LNG 수출입 현황');
    expect(lngFragment).toContain('샘플 데이터입니다');
    expect(lngFragment).toContain('https://cdn.jsdelivr.net/npm/deck.gl@9.1.12/dist.min.js');
  });
});
