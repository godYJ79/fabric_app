import { useState } from 'react';

import { AppHeader } from '@/components/AppHeader';
import { Sidebar } from '@/components/Sidebar';
import { EmptyState } from '@/components/states';
import { useCurrentUser, type CurrentUser } from '@/hooks/use-current-user';
import { useRoute } from '@/hooks/use-route';
import type { View } from '@/lib/route';
import { cn } from '@/lib/utils';
import { LngDashboardView } from '@/views/LngDashboardView';
import { RequestsView } from '@/views/RequestsView';
import { SalesDashboardView } from '@/views/SalesDashboardView';
import { StandardsView } from '@/views/StandardsView';

function Shell({ user }: { readonly user: CurrentUser }) {
  const [route, go] = useRoute();
  const [navOpen, setNavOpen] = useState(false);

  function navigate(view: View) {
    setNavOpen(false);
    go({ view, requestId: null });
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <AppHeader user={user} navOpen={navOpen} onToggleNav={() => setNavOpen((open) => !open)} />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <Sidebar view={route.view} open={navOpen} onNavigate={navigate} />
        {/* The map dashboard fills the whole area; every other screen scrolls inside a padded column. */}
        <main
          className={cn(
            'min-h-0 min-w-0 flex-1',
            route.view === 'lng' ? 'relative overflow-hidden' : 'overflow-y-auto'
          )}
        >
          {route.view === 'lng' ? (
            <LngDashboardView />
          ) : (
            <div className="mx-auto w-full max-w-6xl px-400 py-500">
              {route.view === 'requests' ? (
                <RequestsView
                  user={user}
                  requestId={route.requestId}
                  onSelectRequest={(id) => go({ view: 'requests', requestId: id }, 'replace')}
                />
              ) : route.view === 'sales' ? (
                <SalesDashboardView />
              ) : (
                <StandardsView key={route.view} kind={route.view} user={user} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function App() {
  const user = useCurrentUser();

  if (!user) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background p-400">
        <EmptyState
          title="사용자 정보를 확인할 수 없습니다"
          hint="로그인 세션에 사용자 정보가 없습니다. 새로고침하거나 다시 로그인해 주세요."
        />
      </div>
    );
  }

  return <Shell user={user} />;
}

export default App;
