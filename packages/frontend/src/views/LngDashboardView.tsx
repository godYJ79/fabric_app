import { useEffect, useRef, useState } from 'react';

import lngFragment from '@/dashboards/lng-trade-flow.html?raw';
import { useTheme } from '@/hooks/theme.context';
import { buildLngDocument, LNG_MAP_LIBRARY } from '@/lib/lng-document';

/**
 * "LNG 수출입 현황": the supplied dashboard, shown as it is.
 * It uses sample data and says so itself; it is not connected to any source.
 */
export function LngDashboardView() {
  const { isDark } = useTheme();
  const frameRef = useRef<HTMLIFrameElement>(null);
  // Build the document once: changing srcdoc would reload the frame and lose the map's state.
  const [srcDoc] = useState(() => buildLngDocument(lngFragment, isDark));
  const [mapMissing, setMapMissing] = useState(false);

  // Keep the dashboard's colours in step with the app's theme toggle.
  useEffect(() => {
    frameRef.current?.contentDocument?.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light'
    );
  }, [isDark]);

  function onLoad() {
    const frame = frameRef.current;
    const loaded = (frame?.contentWindow as (Window & { deck?: unknown }) | null | undefined)?.deck;
    setMapMissing(!loaded);
    frame?.contentDocument?.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={frameRef}
        title="LNG 수출입 현황"
        srcDoc={srcDoc}
        onLoad={onLoad}
        // Same-origin so the theme can follow the app; the page is supplied content, not user input.
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="absolute inset-0 h-full w-full border-0 bg-background"
      />
      {mapMissing ? (
        <div
          role="status"
          className="absolute inset-x-400 top-400 rounded-xl border border-destructive/40 bg-card p-400 text-300 text-foreground shadow-lg"
        >
          지도 라이브러리({LNG_MAP_LIBRARY})를 불러오지 못했습니다. 이 대시보드는 지도 라이브러리를
          <span className="font-monospace"> cdn.jsdelivr.net</span>에서 받아오므로, 사내 네트워크가
          해당 주소를 막고 있지 않은지 확인해 주세요. 표와 차트는 지도 없이도 사용할 수 있습니다.
        </div>
      ) : null}
    </div>
  );
}
