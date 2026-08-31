// src/today/pendingDelete.ts
// 05-05-PLAN.md Task 1 — 지연 삭제(delayed-commit) 컨트롤러, 순수 TS 모듈.
// RN/네이티브 모듈을 하나도 import하지 않는다 — @jest-environment node에서 그대로
// 로드 가능해야 한다(src/today/trajectory.ts와 같은 성격).
//
// 설계: setTimeout 하나와 현재 대기 항목 하나만 유지한다(큐잉하지 않는다 — 05-RESEARCH.md
// Assumption A2의 "단일 스낵바 + 즉시 확정" 원칙, iOS 메일 앱 관례와 동일). 새 request가
// 들어왔을 때 이미 대기 중인 항목이 있으면, 그 항목을 먼저 즉시 커밋한 뒤 새 요청을
// 받는다 — 두 개의 undo 스낵바가 동시에 존재하는 상태를 만들지 않는다.
//
// dispose()가 clearTimeout만 하고 끝나지 않는 것이 이 모듈의 핵심이다 — 대기 항목이
// 있으면 즉시 onCommit을 호출한 뒤 타이머를 정리한다. 흔한 "언마운트 시 대기 중인
// 비동기 작업을 취소한다" 반사(이 저장소의 isMountedRef 가드가 대표적)와 정반대다.
// 왜 반대인가: 사용자가 "실행취소"를 누르지 않았는데도 화면을 떠났다는 이유로 삭제가
// 조용히 취소되면, 다음 로드에서 지워졌어야 할 행이 부활한다(05-RESEARCH.md
// Assumption A1). 이 주석이 없으면 다음 실행자/리뷰어가 "더 일반적인 패턴"으로
// 되돌릴 위험이 매우 높다 — 절대 clearTimeout만으로 되돌리지 말 것.
//
// 4000이라는 숫자는 이 파일의 UNDO_WINDOW_MS에만 존재한다 — 스낵바나 화면에
// 재선언하지 않는다.
export const UNDO_WINDOW_MS = 4000;

export type PendingDeleteItem = { id: string; photoPath: string | null };

export type PendingDeleteController = {
  request(item: PendingDeleteItem): void;
  undo(): void;
  dispose(): void;
};

export function createPendingDeleteController(args: {
  delayMs?: number;
  onCommit: (item: PendingDeleteItem) => void;
  onChange: (pendingId: string | null) => void;
}): PendingDeleteController {
  const delayMs = args.delayMs ?? UNDO_WINDOW_MS;
  let pending: { item: PendingDeleteItem; timer: ReturnType<typeof setTimeout> } | null = null;

  // 대기 항목을 확정 커밋하고 대기 상태를 해제한다 — 타이머 만료 경로와 dispose()
  // 즉시 확정 경로가 동일한 이 함수를 공유한다(두 경로가 서로 다른 동작을 하면
  // "언제 커밋되는지"에 대한 계약이 흩어진다).
  function settle(item: PendingDeleteItem) {
    pending = null;
    args.onCommit(item);
    args.onChange(null);
  }

  return {
    request(item) {
      if (pending) {
        // 단일 스낵바 원칙 — 이미 대기 중인 항목이 있으면 새 요청을 받기 전에
        // 먼저 확정한다(큐잉하지 않는다).
        const previous = pending;
        clearTimeout(previous.timer);
        settle(previous.item);
      }
      const timer = setTimeout(() => settle(item), delayMs);
      pending = { item, timer };
      args.onChange(item.id);
    },
    undo() {
      if (!pending) return;
      clearTimeout(pending.timer);
      pending = null;
      args.onChange(null);
    },
    dispose() {
      if (!pending) return;
      const current = pending;
      clearTimeout(current.timer);
      settle(current.item);
    },
  };
}
