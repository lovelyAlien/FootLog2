// src/today/pendingDelete.ts
// 05-05-PLAN.md Task 1 — 지연 삭제(delayed-commit) 컨트롤러, 순수 TS 모듈.
// RED: 아래 스텁은 아직 동작을 구현하지 않는다 — pendingDelete.test.ts의 8개 케이스가
// 실패함을 먼저 확인한 뒤(TDD RED), 다음 커밋에서 실제 구현을 채운다(GREEN).
export const UNDO_WINDOW_MS = 4000;

export type PendingDeleteItem = { id: string; photoPath: string | null };

export type PendingDeleteController = {
  request(item: PendingDeleteItem): void;
  undo(): void;
  dispose(): void;
};

export function createPendingDeleteController(_args: {
  delayMs?: number;
  onCommit: (item: PendingDeleteItem) => void;
  onChange: (pendingId: string | null) => void;
}): PendingDeleteController {
  return {
    request() {
      throw new Error('not implemented');
    },
    undo() {
      throw new Error('not implemented');
    },
    dispose() {
      throw new Error('not implemented');
    },
  };
}
