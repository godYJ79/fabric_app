import { useSemanticModelQuery } from '@/hooks/use-semantic-model-query';
import { SALES_CONNECTION } from '@/lib/sales-model';

export type ModelRows =
  | { readonly state: 'loading'; readonly rows: readonly (readonly unknown[])[] | null }
  | { readonly state: 'error'; readonly message: string; readonly detail: string; readonly retry: () => void }
  | { readonly state: 'ready'; readonly rows: readonly (readonly unknown[])[]; readonly refreshing: boolean };

/**
 * Runs one DAX query against the sales model and folds the two error channels
 * (thrown, and returned by Power BI) into one state. While a newer query runs, the previous
 * rows stay available so a chart can dim instead of vanishing.
 */
export function useModelRows(query: string): ModelRows {
  const { data, isLoading, error, refetch } = useSemanticModelQuery({
    connection: SALES_CONNECTION,
    query,
  });

  if (error) {
    return {
      state: 'error',
      message: '시멘틱 모델에서 값을 가져오지 못했습니다.',
      detail: error.message,
      retry: () => void refetch(),
    };
  }
  if (data?.status === 'error') {
    const permission = data.error.category === 'api';
    return {
      state: 'error',
      message: permission
        ? '모델을 조회할 권한이 없거나 연결에 문제가 있습니다. 모델의 빌드 권한이 필요합니다.'
        : '모델이 질의를 처리하지 못했습니다. 아래 상세 내용의 이름이 모델과 같은지 확인해 주세요.',
      detail: `${data.error.category}: ${data.error.message}`,
      retry: () => void refetch(),
    };
  }
  if (data?.status === 'success') {
    return { state: 'ready', rows: data.table.rows, refreshing: isLoading };
  }
  return { state: 'loading', rows: null };
}
