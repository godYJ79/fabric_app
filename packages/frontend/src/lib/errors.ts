export type ErrorAction = 'load' | 'save' | 'delete';

const PERMISSION_PATTERN = /forbidden|unauthori[sz]ed|permission|denied|\b40[13]\b/i;

/**
 * Turns a failure into a message people can act on, without exposing provider
 * internals. The original error goes to the console for developers.
 */
export function describeError(error: unknown, action: ErrorAction): string {
  console.error('[request-tracker]', action, error);

  const raw = error instanceof Error ? error.message : String(error ?? '');
  if (PERMISSION_PATTERN.test(raw)) {
    return '이 작업을 할 권한이 없거나 로그인이 만료되었습니다. 새로고침한 뒤 다시 시도해 주세요.';
  }

  switch (action) {
    case 'load':
      return '데이터를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    case 'save':
      return '저장하지 못했습니다. 입력 내용을 확인하고 다시 시도해 주세요.';
    case 'delete':
      return '삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }
}
