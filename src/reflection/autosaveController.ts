// src/reflection/autosaveController.ts
// 07-02-PLAN.md Task 2 — 회고 화면(모달/과거 날짜 뷰)의 5초 디바운스 자동저장 컨트롤러.
//
// React/RN/네이티브 모듈을 import하지 않는 순수 TS 모듈이다(`@jest-environment node`에서
// 로드 가능 — src/today/pendingDelete.ts와 동일 제약).
//
// ReflectionDraft가 dateKey와 id를 함께 들고 다니는 것이 이 파일의 핵심 설계 결정이다
// (07-RESEARCH.md Pattern 4의 초안은 두 답변 필드만 담았다): 과거 날짜 뷰에서 스크러버로
// 날짜를 바꾸면 아직 만료되지 않은 디바운스 타이머가 남아 있을 수 있고, 저장 시점에
// "현재 화면의 날짜"를 읽으면 이전 날짜에 쓴 답변이 새 날짜 레코드에 기록되는 데이터
// 오염이 발생한다(T-07-05). draft가 자신의 날짜와 레코드 id를 함께 들고 다니면 이 경합이
// 구조적으로 불가능해진다 — 저장 콜백은 항상 draft에 박힌 dateKey/id로만 쓴다.
//
// 내부 구조는 pendingDelete.ts의 단일 타이머 클로저를 그대로 따르되 의미가 반대다: 이
// 컨트롤러는 취소 가능한 지연 확정이 아니라 취소 불가능한 지연 저장이라 되돌리기 API가
// 없고, 대신 dispose()는 타이머만 정리하고 저장하지 않는다(pendingDelete.dispose()가 즉시
// 확정하는 것과 정반대). 화면 언마운트 직전의 강제 저장은 호출자가 flush()를 명시적으로
// 부르는 책임이며(모달의 닫기 핸들러가 flush() 후 router.back()), dispose()는 그 뒤의
// 타이머 누수 정리용이다. flush()는 저장 후 보관 중인 draft를 비워 같은 값이 두 번
// 저장되지 않게 한다.
export const REFLECTION_AUTOSAVE_DEBOUNCE_MS = 5000;

export type ReflectionDraft = {
  dateKey: string;
  id: string;
  newPlaceAnswer: string;
  freeReflection: string;
};

export type AutosaveController = {
  notify(draft: ReflectionDraft): void;
  // flush()가 저장 성공 여부를 알려준다(대기 중인 draft가 없으면 true) — 호출자(모달의
  // 닫기 핸들러)가 저장이 실패했을 때 화면을 이미 떠나 실패 UI를 놓치지 않도록, 결과를
  // 기다린 뒤에만 내비게이션할 수 있게 하기 위함(코드 리뷰 발견 — 이전에는 flush()가
  // fire-and-forget이라 닫기 직후 저장이 실패해도 화면이 이미 언마운트돼 재시도 UI가
  // 뜨지 않고 입력 내용이 조용히 사라졌다).
  flush(): Promise<boolean>;
  dispose(): void;
};

export function createAutosaveController(args: {
  onSave: (draft: ReflectionDraft) => Promise<boolean>;
  debounceMs?: number;
}): AutosaveController {
  const debounceMs = args.debounceMs ?? REFLECTION_AUTOSAVE_DEBOUNCE_MS;
  let pending: { draft: ReflectionDraft; timer: ReturnType<typeof setTimeout> } | null = null;

  // 대기 중인 draft를 저장하고 대기 상태를 해제한다 — 타이머 만료 경로와 flush() 즉시
  // 저장 경로가 동일한 이 함수를 공유한다.
  function save(draft: ReflectionDraft): Promise<boolean> {
    pending = null;
    return args.onSave(draft);
  }

  return {
    notify(draft) {
      if (pending) {
        clearTimeout(pending.timer);
      }
      // 디바운스 타이머 만료 경로는 아무도 결과를 기다리지 않는 백그라운드 저장이다 —
      // save()가 반환하는 Promise를 의도적으로 버린다(오류는 onSave 내부에서 이미
      // 처리됨, checkin/settings 저장과 동일 계약).
      const timer = setTimeout(() => {
        void save(draft);
      }, debounceMs);
      pending = { draft, timer };
    },
    flush() {
      if (!pending) return Promise.resolve(true);
      const current = pending;
      clearTimeout(current.timer);
      return save(current.draft);
    },
    dispose() {
      // pendingDelete.dispose()와 의미가 반대다 — 여기서는 저장하지 않고 타이머만
      // 정리한다. 강제 저장이 필요하면 호출자가 dispose() 전에 flush()를 명시적으로
      // 불러야 한다.
      if (!pending) return;
      clearTimeout(pending.timer);
      pending = null;
    },
  };
}
