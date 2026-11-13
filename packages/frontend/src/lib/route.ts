/** The screens reachable from the left menu. */
export const VIEWS = ['requests', 'words', 'terms', 'formulas', 'lng', 'sales'] as const;
export type View = (typeof VIEWS)[number];

export const STANDARD_VIEWS = ['words', 'terms', 'formulas'] as const;
export type StandardView = (typeof STANDARD_VIEWS)[number];

export const DASHBOARD_VIEWS = ['lng', 'sales'] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export function isStandardView(view: View): view is StandardView {
  return (STANDARD_VIEWS as readonly string[]).includes(view);
}

export function isDashboardView(view: View): view is DashboardView {
  return (DASHBOARD_VIEWS as readonly string[]).includes(view);
}

/** What each screen is called in the menu and as its page title. */
export const VIEW_LABEL: Record<View, string> = {
  requests: '데이터 요청',
  words: '표준 단어',
  terms: '표준 용어',
  formulas: '표준 계산식',
  lng: 'LNG 수출입 현황',
  sales: '판매 현황',
};

export interface Route {
  view: View;
  /** The open request, only meaningful on the requests screen. */
  requestId: string | null;
}

const REQUEST_PREFIX = '#request=';
const STANDARDS_PREFIX = '#standards=';
const DASHBOARDS_PREFIX = '#dashboards=';
// Request ids are UUIDs. Anything else in the address is ignored.
const ID_PATTERN = /^[0-9a-fA-F-]{8,64}$/;

export const DEFAULT_ROUTE: Route = { view: 'requests', requestId: null };

/**
 * `#request=<id>` opens a request, `#standards=words|terms|formulas` opens a dictionary,
 * `#dashboards=lng|sales` opens a dashboard, anything else is the request list.
 * Unknown values fall back to the request list.
 */
export function parseHash(hash: string): Route {
  if (hash.startsWith(STANDARDS_PREFIX)) {
    const value = hash.slice(STANDARDS_PREFIX.length);
    if ((STANDARD_VIEWS as readonly string[]).includes(value)) {
      return { view: value as StandardView, requestId: null };
    }
    return DEFAULT_ROUTE;
  }
  if (hash.startsWith(DASHBOARDS_PREFIX)) {
    const value = hash.slice(DASHBOARDS_PREFIX.length);
    if ((DASHBOARD_VIEWS as readonly string[]).includes(value)) {
      return { view: value as DashboardView, requestId: null };
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
  if (isDashboardView(route.view)) return DASHBOARDS_PREFIX + route.view;
  return STANDARDS_PREFIX + route.view;
}
