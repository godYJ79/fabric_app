/** The screens reachable from the left menu. */
export const VIEWS = ['requests', 'words', 'terms', 'formulas'] as const;
export type View = (typeof VIEWS)[number];

export const STANDARD_VIEWS = ['words', 'terms', 'formulas'] as const;
export type StandardView = (typeof STANDARD_VIEWS)[number];

export function isStandardView(view: View): view is StandardView {
  return (STANDARD_VIEWS as readonly string[]).includes(view);
}

export interface Route {
  view: View;
  /** The open request, only meaningful on the requests screen. */
  requestId: string | null;
}

const REQUEST_PREFIX = '#request=';
const STANDARDS_PREFIX = '#standards=';
// Request ids are UUIDs. Anything else in the address is ignored.
const ID_PATTERN = /^[0-9a-fA-F-]{8,64}$/;

export const DEFAULT_ROUTE: Route = { view: 'requests', requestId: null };

/**
 * `#request=<id>` opens a request, `#standards=words|terms|formulas` opens a dictionary,
 * anything else is the request list. Unknown values fall back to the request list.
 */
export function parseHash(hash: string): Route {
  if (hash.startsWith(STANDARDS_PREFIX)) {
    const value = hash.slice(STANDARDS_PREFIX.length);
    if ((STANDARD_VIEWS as readonly string[]).includes(value)) {
      return { view: value as StandardView, requestId: null };
    }
    return DEFAULT_ROUTE;
  }
  if (hash.startsWith(REQUEST_PREFIX)) {
    let value = '';
    try {
      value = decodeURIComponent(hash.slice(REQUEST_PREFIX.length));
    } catch {
      return DEFAULT_ROUTE;
    }
    return ID_PATTERN.test(value) ? { view: 'requests', requestId: value } : DEFAULT_ROUTE;
  }
  return DEFAULT_ROUTE;
}

export function routeToHash(route: Route): string {
  if (route.view === 'requests') {
    return route.requestId ? REQUEST_PREFIX + encodeURIComponent(route.requestId) : '';
  }
  return STANDARDS_PREFIX + route.view;
}
