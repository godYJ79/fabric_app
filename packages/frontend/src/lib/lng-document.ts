/**
 * The LNG dashboard is a complete page of its own (map, search, charts, sample data),
 * so it is shown inside the app unchanged, in a frame. The source file is a fragment
 * without a document shell; this wraps it so the browser renders it in standards mode,
 * and fixes the colour theme to the app's.
 */
export function buildLngDocument(fragment: string, dark: boolean): string {
  return (
    '<!doctype html>' +
    `<html lang="ko" data-theme="${dark ? 'dark' : 'light'}">` +
    '<head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    // The fragment starts with <title>, <link> and <style>, then its first <div> opens the body.
    fragment +
    '</html>'
  );
}

/** The map library the dashboard loads from a CDN. */
export const LNG_MAP_LIBRARY = 'deck.gl';
