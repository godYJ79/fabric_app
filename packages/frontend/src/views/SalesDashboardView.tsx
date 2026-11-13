import { X } from 'lucide-react';
import { useState } from 'react';

import { DetailTable } from '@/components/sales/DetailTable';
import { DimensionCard } from '@/components/sales/DimensionCard';
import { KpiStrip } from '@/components/sales/KpiStrip';
import { DIMENSIONS, selectionCount, toggleMember, type Selection } from '@/lib/sales-model';

/**
 * "판매 현황": 매출 실적 / 계획 / 달성률 from SementicModel_INZI, by dimension.
 * Picking a member in any chart filters the totals and every other chart (Power BI style);
 * the picked members show as chips that can be removed one by one or all at once.
 */
export function SalesDashboardView() {
  const [selection, setSelection] = useState<Selection>({});
  const count = selectionCount(selection);

  const pick = (key: string, member: string, additive: boolean) =>
    setSelection((s) => toggleMember(s, key, member, additive));
  const drop = (key: string, member: string) =>
    setSelection((s) => toggleMember(s, key, member, true));

  return (
    <div className="space-y-400">
      <header>
        <h2 className="text-hero-700 font-bold tracking-tight text-foreground">판매 현황</h2>
        <p className="mt-100 text-300 text-muted-foreground">
          막대를 누르면 나머지 차트와 합계가 그 조건으로 바뀝니다. Ctrl(⌘)이나 Shift를 누른 채 누르면 여러 개를 고를 수 있고, 같은 막대를 다시 누르면 해제됩니다.
        </p>
      </header>

      <div className="flex min-h-8 flex-wrap items-center gap-200" aria-label="선택한 조건">
        {count === 0 ? (
          <p className="text-200 text-muted-foreground">선택한 조건 없음 (전체)</p>
        ) : (
          <>
            {DIMENSIONS.flatMap((d) =>
              (selection[d.key] ?? []).map((m) => (
                <button
                  key={`${d.key}:${m}`}
                  type="button"
                  onClick={() => drop(d.key, m)}
                  aria-label={`${d.label} ${m} 선택 해제`}
                  className="flex items-center gap-100 rounded-full bg-accent px-300 py-100 text-200 text-accent-foreground hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="text-muted-foreground">{d.label}</span> {m}
                  <X aria-hidden="true" className="icon-size-200" />
                </button>
              ))
            )}
            <button
              type="button"
              onClick={() => setSelection({})}
              className="rounded-lg px-200 py-100 text-200 font-semibold text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              모두 해제
            </button>
          </>
        )}
      </div>

      <KpiStrip selection={selection} />

      <div className="grid gap-300 lg:grid-cols-2">
        {DIMENSIONS.map((d) => (
          <DimensionCard key={d.key} dim={d} selection={selection} onPick={pick} />
        ))}
      </div>

      <DetailTable selection={selection} />
    </div>
  );
}
