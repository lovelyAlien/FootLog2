// src/reflection/useReflectionDraft.ts
// 07-04-PLAN.md Task 1 — 회고 모달(07-05)과 과거 날짜 뷰 인라인 편집(07-06)이 공유할
// 로드/디바운스/AppState flush/재시도 훅. 화면 두 곳이 이 파일 하나로 로드/자동저장 전체를
// 얻는다(D-04 — 과거 날짜 편집은 오늘 화면과 동일 로직을 그대로 재사용).
//
// SQL/한국어 문구/디바운스 리터럴을 이 파일에 두지 않는다 — 각각 reflectionRepo.ts /
// content.ts / autosaveController.ts(REFLECTION_AUTOSAVE_DEBOUNCE_MS) 소관이다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { createAutosaveController } from './autosaveController';
import type { AutosaveController, ReflectionDraft } from './autosaveController';
import { getReflectionByDate, upsertReflection } from './reflectionRepo';
import { defaultCryptoDeps } from '../checkin/deps';
import { toIsoTimestamp } from '../checkin/localDate';
import type { MigratableDb } from '../db/migrations';

export type ReflectionDraftBinding = {
  newPlaceAnswer: string;
  freeReflection: string;
  onChangeNewPlaceAnswer: (value: string) => void;
  onChangeFreeReflection: (value: string) => void;
  saveFailed: boolean;
  onRetry: () => void;
  // Promise<boolean>을 반환한다(true = 저장 성공 또는 대기 중인 변경 없음) — 호출자가
  // 실패 시 화면을 떠나지 않고 재시도 UI를 보여줄 수 있게 하기 위함.
  flush: () => Promise<boolean>;
};

export function useReflectionDraft(db: MigratableDb, dateKey: string): ReflectionDraftBinding {
  const [newPlaceAnswer, setNewPlaceAnswer] = useState('');
  const [freeReflection, setFreeReflection] = useState('');
  const [saveFailed, setSaveFailed] = useState(false);

  // CheckinDetailScreen.tsx/SettingsScreen.tsx와 동일한 언마운트 후 setState 방지 가드.
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // PastDateScreen.tsx의 activeDateKeyRef와 동일 관용구 — 응답이 돌아왔을 때 "그 시점의
  // 현재" dateKey와 비교해, 스크러버로 날짜를 빠르게 옮길 때 늦게 도착한 로드 응답이 최신
  // 날짜의 입력을 덮어쓰지 못하게 막는다.
  const dateKeyRef = useRef(dateKey);
  useEffect(() => {
    dateKeyRef.current = dateKey;
  }, [dateKey]);

  // 현재 편집 중인 레코드 id. 로드된 행이 있으면 그 id, 없으면 새 id(아직 DB에 쓰지
  // 않는다 — 사용자가 아무것도 입력하지 않으면 빈 레코드를 만들지 않는다). 초기값과
  // dateKey 변경 시 리셋값은 항상 신선한 UUID다(빈 문자열이 아니다) — 코드 리뷰 발견:
  // 이전에는 로드가 끝나야만 값이 채워져, 로드 완료 전에 입력하면 (a) 최초 진입 시
  // 빈 문자열 id로 저장되거나 (b) 과거 날짜 뷰에서 스크러버로 날짜를 옮긴 직후 이전
  // 날짜의 실제 id가 새 날짜의 draft에 새어 들어가 INSERT 시 PRIMARY KEY 충돌로
  // 저장이 조용히 실패했다.
  const recordIdRef = useRef<string>(defaultCryptoDeps.randomUUID());

  // 마지막으로 시도한(그러나 실패했을 수 있는) draft — SettingsScreen.tsx의
  // lastAttemptRef/handleRetry 관용구와 동일 정신.
  const lastAttemptRef = useRef<ReflectionDraft | null>(null);

  // 저장 함수. onSave(draft)는 upsertReflection의 결과로만 saveFailed를 반영한다 —
  // upsertReflection이 이미 내부에서 1회 재시도를 수행하므로 여기서 다시 감싸지 않는다
  // (이중 래핑은 D-01이 정한 "1회 자동 재시도" 계약을 깬다). 성공 여부를 Promise<boolean>
  // 으로도 반환한다 — flush()를 기다리는 호출자(모달 닫기 핸들러)가 React state 갱신
  // 타이밍에 기대지 않고 이 반환값만으로 성공/실패를 곧바로 알 수 있게 하기 위함(코드
  // 리뷰 발견 — isMountedRef가 false여도 반환값 자체는 그대로 흘러간다).
  const onSave = useCallback(
    (draft: ReflectionDraft): Promise<boolean> => {
      lastAttemptRef.current = draft;
      return upsertReflection(db, {
        id: draft.id,
        date: draft.dateKey,
        newPlaceAnswer: draft.newPlaceAnswer,
        freeReflection: draft.freeReflection,
        now: toIsoTimestamp(),
      })
        .then((result) => {
          if (isMountedRef.current) setSaveFailed(!result.ok);
          return result.ok;
        })
        .catch((error) => {
          console.error('Failed to save reflection', error);
          if (isMountedRef.current) setSaveFailed(true);
          return false;
        });
    },
    [db]
  );

  // 컨트롤러는 마운트 시 1회만 생성한다(lazy useState 초기화) — onSave는 db가 바뀌지
  // 않는 한 안정적인 useCallback이라 재생성할 필요가 없다. eslint-disable 근거:
  // (tabs)/index/index.tsx pendingDeleteController와 동일 — onSave 내부의
  // lastAttemptRef.current 쓰기는 onSave가 실제 호출될 때(자동저장 이벤트
  // 시점)만 일어나며, 이 초기화 함수 실행(렌더 중) 자체는 ref를 읽거나 쓰지
  // 않는다.
  // eslint-disable-next-line react-hooks/refs
  const [controller] = useState<AutosaveController>(() => createAutosaveController({ onSave }));

  // (0) recordIdRef 리셋 — dateKey가 바뀌면 (1) 로드 effect의 비동기 응답을 기다리지
  // 않고 즉시 새 UUID로 리셋한다. React는 같은 커밋에서 변경된 모든 effect의 cleanup을
  // 먼저(선언 순서대로) 실행한 뒤에야 setup을 실행하므로, 아래 (5) flush-on-date-change
  // effect의 cleanup(이전 날짜 강제 저장)은 이 리셋이 실행되기 전에 이미 이전 날짜의
  // id로 완료된다 — 그 다음에야 이 effect가 새 날짜용 신선한 id로 교체하므로 두 날짜의
  // id가 뒤섞이지 않는다. 로드가 기존 행을 찾으면 (1)에서 그 행의 실제 id로 다시
  // 덮어쓴다.
  useEffect(() => {
    recordIdRef.current = defaultCryptoDeps.randomUUID();
  }, [dateKey]);

  // (1) 로드 — dateKey가 바뀔 때마다 getReflectionByDate를 호출한다. 로드로 채운 값은
  // controller.notify를 호출하지 않는다(로드가 저장을 유발하면 안 된다).
  useEffect(() => {
    const requestedDateKey = dateKey;
    getReflectionByDate(db, requestedDateKey)
      .then((row) => {
        if (!isMountedRef.current || requestedDateKey !== dateKeyRef.current) return;
        if (row) {
          setNewPlaceAnswer(row.new_place_answer ?? '');
          setFreeReflection(row.free_reflection ?? '');
          recordIdRef.current = row.id;
        } else {
          setNewPlaceAnswer('');
          setFreeReflection('');
          // recordIdRef는 위 (0) 리셋 effect가 이미 신선한 UUID로 채워뒀다 — 여기서
          // 다시 만들면 (0)이 만든 값과 달라져 리셋의 의미가 없어진다.
        }
        setSaveFailed(false);
      })
      .catch((error) => {
        console.error('Failed to load reflection', error);
      });
  }, [db, dateKey]);

  // (5) 날짜 전환/언마운트 flush — dateKey에 의존하는 effect의 cleanup에서
  // controller.flush()를 호출한다. draft가 자신의 dateKey/id를 들고 있으므로 이 flush는
  // 이전 날짜 레코드에 정확히 기록된다(T-07-05). 결과를 기다리지 않는다 — cleanup은
  // async를 반환할 수 없고, 실패 시 saveFailed 상태는 setSaveFailed로 이미 반영된다.
  useEffect(() => {
    return () => {
      void controller.flush();
    };
  }, [controller, dateKey]);

  // 마운트 해제 시에는 flush 이후 controller.dispose()로 타이머를 정리한다.
  useEffect(() => {
    return () => {
      void controller.flush();
      controller.dispose();
    };
  }, [controller]);

  // (4) AppState flush — active로 돌아올 때도 콜백이 불리므로 이 가드가 없으면 포그라운드
  // 복귀 시 의도치 않은 저장이 발생한다(07-RESEARCH.md Pitfall 4).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') return;
      void controller.flush();
    });
    return () => subscription.remove();
  }, [controller]);

  // (2) 입력 — 병합된 최신 값으로 controller.notify를 호출한다.
  const onChangeNewPlaceAnswer = useCallback(
    (value: string) => {
      setNewPlaceAnswer(value);
      controller.notify({
        dateKey,
        id: recordIdRef.current,
        newPlaceAnswer: value,
        freeReflection,
      });
    },
    [controller, dateKey, freeReflection]
  );

  const onChangeFreeReflection = useCallback(
    (value: string) => {
      setFreeReflection(value);
      controller.notify({
        dateKey,
        id: recordIdRef.current,
        newPlaceAnswer,
        freeReflection: value,
      });
    },
    [controller, dateKey, newPlaceAnswer]
  );

  // (6) 재시도 — lastAttemptRef.current가 있으면 그 draft로 저장을 다시 시도한다.
  const onRetry = useCallback(() => {
    const lastAttempt = lastAttemptRef.current;
    if (lastAttempt) {
      onSave(lastAttempt);
    }
  }, [onSave]);

  // (7) flush 노출 — 모달의 닫기 핸들러가 flush()의 결과를 기다린 뒤에만 router.back()을
  // 호출한다(07-05). Promise<boolean>을 그대로 반환해, 저장이 실패했을 때 호출자가 화면을
  // 떠나지 않고 이미 렌더된 재시도 UI(saveFailed)를 사용자가 보게 할 수 있다.
  const flush = useCallback(() => {
    return controller.flush();
  }, [controller]);

  return {
    newPlaceAnswer,
    freeReflection,
    onChangeNewPlaceAnswer,
    onChangeFreeReflection,
    saveFailed,
    onRetry,
    flush,
  };
}
