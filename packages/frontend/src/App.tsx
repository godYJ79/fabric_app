import { useMemo, useState } from 'react';
import { Moon, Plus, Sun } from 'lucide-react';

import { FilterBar } from '@/components/FilterBar';
import { RequestDetail } from '@/components/RequestDetail';
import { RequestForm } from '@/components/RequestForm';
import { RequestList } from '@/components/RequestList';
import { EmptyState } from '@/components/states';
import { SummaryStrip } from '@/components/SummaryStrip';
import { useTheme } from '@/hooks/theme.context';
import { useCurrentUser, type CurrentUser } from '@/hooks/use-current-user';
import { useDebounced } from '@/hooks/use-debounced';
import { useHashSelection } from '@/hooks/use-hash-selection';
import { useRequests } from '@/hooks/use-requests';
import { useSummary } from '@/hooks/use-summary';
import { downloadCsv } from '@/lib/csv';
import { describeError } from '@/lib/errors';
import { buildRequestsCsv, exportFilename } from '@/lib/export-requests';
import {
  buildWhere,
  DEFAULT_FILTERS,
  hasActiveFilters,
  type RequestFilters,
} from '@/lib/query';
import { fetchExportRows } from '@/lib/request-queries';
import { cn } from '@/lib/utils';

/** The most rows one export will contain. */
const EXPORT_CAP = 5000;

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
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounced(searchText, 300);
  // Clearing the box applies at once; typing waits until the user pauses.
  const search = searchText === '' ? '' : debouncedSearch;
  const effective = useMemo(() => ({ ...filters, search }), [filters, search]);

  const [selectedId, setSelectedId] = useHashSelection();
  const [composing, setComposing] = useState(false);
  const requests = useRequests(effective, user.id);

  // The summary is recounted after anything that changes the numbers.
  const [summaryVersion, setSummaryVersion] = useState(0);
  const summary = useSummary(summaryVersion);
  const recount = () => setSummaryVersion((v) => v + 1);

  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // On narrow screens only one panel is shown at a time.
  const detailOpen = selectedId !== null || composing;
  const filtersActive = hasActiveFilters({ ...filters, search: searchText });

  function change(patch: Partial<RequestFilters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
  }

  function reset() {
    setFilters(DEFAULT_FILTERS);
    setSearchText('');
  }

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

  function refresh() {
    requests.reload();
    recount();
  }

  async function exportCsv() {
    setExporting(true);
    setExportMessage(null);
    try {
      const { items, truncated } = await fetchExportRows(
        buildWhere(effective, user.id),
        EXPORT_CAP
      );
      if (items.length === 0) {
        setExportMessage('내보낼 요청이 없습니다. 필터를 확인해 주세요.');
        return;
      }
      downloadCsv(exportFilename(), buildRequestsCsv(items));
      setExportMessage(
        truncated
          ? `${items.length.toLocaleString('ko-KR')}건을 내보냈습니다. 요청이 더 있지만 최대 건수까지만 담았습니다.`
          : `${items.length.toLocaleString('ko-KR')}건을 내보냈습니다.`
      );
    } catch (e) {
      setExportMessage(describeError(e, 'load'));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-full bg-background">
      <Header user={user} onCreate={openCreate} />
      <main className="mx-auto w-full max-w-6xl space-y-500 px-400 py-500">
        <div className={cn(detailOpen && 'hidden lg:block')}>
          <SummaryStrip
            counts={summary.counts}
            truncated={summary.truncated}
            failed={summary.failed}
            filters={filters}
            onSelect={change}
          />
        </div>

        <div className="grid gap-600 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
          <section
            aria-label="요청 목록"
            className={cn('space-y-400', detailOpen && 'hidden lg:block')}
          >
            <FilterBar
              filters={filters}
              searchText={searchText}
              isStaff={user.isStaff}
              loadedAt={requests.loadedAt}
              refreshing={requests.status === 'loading'}
              exporting={exporting}
              exportMessage={exportMessage}
              canReset={filtersActive}
              onSearchText={setSearchText}
              onChange={change}
              onRefresh={refresh}
              onExport={() => void exportCsv()}
              onReset={reset}
            />
            <RequestList
              items={requests.items}
              status={requests.status}
              error={requests.error}
              statusFilter={filters.status}
              filtersActive={filtersActive}
              isStaff={user.isStaff}
              selectedId={selectedId}
              hasMore={requests.hasMore}
              loadingMore={requests.loadingMore}
              loadMoreError={requests.loadMoreError}
              onSelect={select}
              onCreate={openCreate}
              onReset={reset}
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
                  // Show the new row: drop filters it might not match.
                  reset();
                  requests.addLocal(created);
                  recount();
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
                onChanged={(patch) => {
                  requests.patchLocal(selectedId, patch);
                  recount();
                }}
                onDeleted={(id) => {
                  requests.removeLocal(id);
                  recount();
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
        </div>
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
