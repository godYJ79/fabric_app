import { useState } from 'react';
import { Moon, Plus, Sun } from 'lucide-react';

import { RequestDetail } from '@/components/RequestDetail';
import { RequestForm } from '@/components/RequestForm';
import { RequestList } from '@/components/RequestList';
import { EmptyState } from '@/components/states';
import { useTheme } from '@/hooks/theme.context';
import { useCurrentUser, type CurrentUser } from '@/hooks/use-current-user';
import { useRequests, type StatusFilter } from '@/hooks/use-requests';
import { cn } from '@/lib/utils';

function Header({
  user,
  onCreate,
}: {
  readonly user: CurrentUser;
  readonly onCreate: () => void;
}) {
  const { isDark, toggleTheme } = useTheme();
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-300 px-400 py-300">
        <div className="min-w-0">
          <h1 className="truncate text-500 font-semibold text-foreground">
            데이터 요청 관리
          </h1>
          <p className="truncate text-200 text-muted-foreground">
            <span className="font-medium text-foreground">{user.email}</span>
            <span
              className={cn(
                'ml-200 rounded-md border px-200 py-100-nudge font-monospace',
                user.isStaff
                  ? 'border-primary/40 bg-accent text-accent-foreground'
                  : 'border-border bg-muted text-muted-foreground'
              )}
            >
              {user.isStaff ? '담당자' : '요청자'}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-200">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? '밝은 화면으로 전환' : '어두운 화면으로 전환'}
            className="rounded-lg p-200 text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isDark ? (
              <Sun aria-hidden="true" className="icon-size-300" />
            ) : (
              <Moon aria-hidden="true" className="icon-size-300" />
            )}
          </button>
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-200 rounded-lg bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <Plus aria-hidden="true" className="icon-size-200" />새 요청
          </button>
        </div>
      </div>
    </header>
  );
}

function Tracker({ user }: { readonly user: CurrentUser }) {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const requests = useRequests(filter);

  // On narrow screens only one panel is shown at a time.
  const detailOpen = selectedId !== null || composing;

  function openCreate() {
    setSelectedId(null);
    setComposing(true);
  }

  function select(id: string) {
    setComposing(false);
    setSelectedId(id);
  }

  function close() {
    setComposing(false);
    setSelectedId(null);
  }

  return (
    <div className="min-h-full bg-background">
      <Header user={user} onCreate={openCreate} />
      <main className="mx-auto grid w-full max-w-6xl gap-600 px-400 py-500 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <section aria-label="요청 목록" className={cn(detailOpen && 'hidden lg:block')}>
          <RequestList
            items={requests.items}
            status={requests.status}
            error={requests.error}
            filter={filter}
            isStaff={user.isStaff}
            selectedId={selectedId}
            hasMore={requests.hasMore}
            loadingMore={requests.loadingMore}
            loadMoreError={requests.loadMoreError}
            onFilter={setFilter}
            onSelect={select}
            onCreate={openCreate}
            onRetry={requests.reload}
            onLoadMore={requests.loadMore}
          />
        </section>

        <section
          aria-label="요청 상세"
          className={cn(!detailOpen && 'hidden lg:block')}
        >
          {composing ? (
            <RequestForm
              user={user}
              onCancel={close}
              onCreated={(created) => {
                requests.addLocal(created);
                setComposing(false);
                setSelectedId(created.id);
              }}
            />
          ) : selectedId ? (
            <RequestDetail
              key={selectedId}
              id={selectedId}
              user={user}
              onBack={close}
              onChanged={(patch) => requests.patchLocal(selectedId, patch)}
              onDeleted={(id) => {
                requests.removeLocal(id);
                close();
              }}
            />
          ) : (
            <EmptyState
              title="요청을 선택하세요"
              hint="왼쪽 목록에서 요청을 고르거나 새 요청을 등록해 주세요."
            />
          )}
        </section>
      </main>
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

  return <Tracker user={user} />;
}

export default App;
