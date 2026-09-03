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
  flush: () => void;
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
  // 않는다 — 사용자가 아무것도 입력하지 않으면 빈 레코드를 만들지 않는다).
  const recordIdRef = useRef<string>('');

  // 마지막으로 시도한(그러나 실패했을 수 있는) draft — SettingsScreen.tsx의
  // lastAttemptRef/handleRetry 관용구와 동일 정신.
  const lastAttemptRef = useRef<ReflectionDraft | null>(null);

  // 저장 함수. onSave(draft)는 upsertReflection의 결과로만 saveFailed를 반영한다 —
  // upsertReflection이 이미 내부에서 1회 재시도를 수행하므로 여기서 다시 감싸지 않는다
  // (이중 래핑은 D-01이 정한 "1회 자동 재시도" 계약을 깬다).
  const onSave = useCallback(
    (draft: ReflectionDraft) => {
      lastAttemptRef.current = draft;
      upsertReflection(db, {
        id: draft.id,
        date: draft.dateKey,
        newPlaceAnswer: draft.newPlaceAnswer,
        freeReflection: draft.freeReflection,
        now: toIsoTimestamp(),
      })
        .then((result) => {
          if (!isMountedRef.current) return;
          setSaveFailed(!result.ok);
        })
        .catch((error) => {
          console.error('Failed to save reflection', error);
          if (!isMountedRef.current) return;
          setSaveFailed(true);
        });
    },
    [db]
  );

  // 컨트롤러는 마운트 시 1회만 생성한다(lazy useState 초기화) — onSave는 db가 바뀌지
  // 않는 한 안정적인 useCallback이라 재생성할 필요가 없다.
  const [controller] = useState<AutosaveController>(() => createAutosaveController({ onSave }));

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
          recordIdRef.current = defaultCryptoDeps.randomUUID();
        }
        setSaveFailed(false);
      })
      .catch((error) => {
        console.error('Failed to load reflection', error);
      });
  }, [db, dateKey]);

  // (5) 날짜 전환/언마운트 flush — dateKey에 의존하는 effect의 cleanup에서
  // controller.flush()를 호출한다. draft가 자신의 dateKey/id를 들고 있으므로 이 flush는
  // 이전 날짜 레코드에 정확히 기록된다(T-07-05).
  useEffect(() => {
    return () => {
      controller.flush();
    };
  }, [controller, dateKey]);

  // 마운트 해제 시에는 flush 이후 controller.dispose()로 타이머를 정리한다.
  useEffect(() => {
    return () => {
      controller.flush();
      controller.dispose();
    };
  }, [controller]);

  // (4) AppState flush — active로 돌아올 때도 콜백이 불리므로 이 가드가 없으면 포그라운드
  // 복귀 시 의도치 않은 저장이 발생한다(07-RESEARCH.md Pitfall 4).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') return;
      controller.flush();
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

  // (7) flush 노출 — 모달의 닫기 핸들러가 flush() 후 router.back()을 호출하는 순서를
  // 07-05가 쓴다.
  const flush = useCallback(() => {
    controller.flush();
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
