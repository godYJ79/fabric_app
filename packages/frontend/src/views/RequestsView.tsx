import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { FilterBar } from '@/components/FilterBar';
import { RequestDetail } from '@/components/RequestDetail';
import { RequestForm } from '@/components/RequestForm';
import { RequestList } from '@/components/RequestList';
import { EmptyState } from '@/components/states';
import { SummaryStrip } from '@/components/SummaryStrip';
import type { CurrentUser } from '@/hooks/use-current-user';
import { useDebounced } from '@/hooks/use-debounced';
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

export function RequestsView({
  user,
  requestId,
  onSelectRequest,
}: {
  readonly user: CurrentUser;
  /** The open request, kept in the address bar by the app shell. */
  readonly requestId: string | null;
  readonly onSelectRequest: (id: string | null) => void;
}) {
  const [filters, setFilters] = useState<RequestFilters>(DEFAULT_FILTERS);
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebounced(searchText, 300);
  // Clearing the box applies at once; typing waits until the user pauses.
  const search = searchText === '' ? '' : debouncedSearch;
  const effective = useMemo(() => ({ ...filters, search }), [filters, search]);

  const selectedId = requestId;
  const setSelectedId = onSelectRequest;
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
    <div className="space-y-500">
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-300',
          detailOpen && 'hidden lg:flex'
        )}
      >
        <div>
          <h2 className="text-hero-700 font-bold tracking-tight text-foreground">데이터 요청</h2>
          <p className="mt-100 text-300 text-muted-foreground">
            데이터가 이상하거나 확인이 필요할 때 요청을 남기고 처리 상황을 확인합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-200 rounded-full bg-primary px-400 py-200 text-300 font-semibold text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Plus aria-hidden="true" className="icon-size-200" />새 요청
        </button>
      </div>

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
    </div>
  );
}

