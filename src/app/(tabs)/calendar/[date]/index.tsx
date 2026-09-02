// src/app/(tabs)/calendar/[date]/index.tsx
// 06-05-PLAN.md Task 1 — 과거 날짜 화면 라우트, 얇은 래퍼 + fail-closed 파라미터 검증.
//
// 이 파일은 오직 세 가지만 한다: useLocalSearchParams로 date를 읽고,
// isValidLocalDateKey로 검증하고, 통과하면 useSQLiteContext로 db를 얻어
// PastDateScreen에 넘긴다. 화면 JSX·스타일·state·데이터 조회를 이 파일에 절대
// 넣지 않는다((tabs)/index/[id].tsx와 동일한 얇은 래퍼 계약).
//
// T-06-02(Tampering, mitigate) — 조작되거나 형식이 깨진 date 파라미터(딥링크,
// 잘못된 push 등)가 쿼리나 화면 상태에 도달하기 전에 `/calendar`로 되돌린다
// (fail closed). throw하거나 빈 화면을 남기지 않는다.
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { isValidLocalDateKey } from '../../../../calendar/monthGrid';
import { PastDateScreen } from '../../../../calendar/PastDateScreen';

export default function PastDateRoute() {
  const { date } = useLocalSearchParams<{ date: string }>();
  // Rules of Hooks — 검증 실패 시 조기 반환하기 전에 모든 훅을 무조건 호출해야
  // 한다. useSQLiteContext를 아래 if문 뒤로 미루면 조건부 훅 호출이 된다.
  const db = useSQLiteContext();

  if (!isValidLocalDateKey(date)) {
    return <Redirect href="/calendar" />;
  }

  return <PastDateScreen db={db} dateKey={date} />;
}
