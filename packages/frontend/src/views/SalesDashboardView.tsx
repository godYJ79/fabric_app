import { EmptyState } from '@/components/states';

/**
 * "판매 현황": will read the SementicModel_INZI semantic model in Fabric_testbox.
 * Until that model is connected and its schema has been read, this shows no figures at all
 * rather than invented ones.
 */
export function SalesDashboardView() {
  return (
    <div className="space-y-400">
      <header>
        <h2 className="text-600 font-semibold text-foreground">판매 현황</h2>
        <p className="mt-100 text-300 text-muted-foreground">
          시멘틱 모델을 연결해 만드는 판매 현황 대시보드입니다. 차트를 선택하면 다른 차트가 함께 바뀝니다.
        </p>
      </header>
      <EmptyState
        title="시멘틱 모델이 아직 연결되지 않았습니다"
        hint="연결할 모델: Fabric_testbox 워크스페이스의 SementicModel_INZI. 연결과 스키마 확인이 끝나면 이 화면에 차트가 표시됩니다."
      />
    </div>
  );
}
