// src/app/(tabs)/calendar/index.tsx
// 06-03-PLAN.md Task 1 — 캘린더 탭 홈 라우트, 얇은 래퍼.
//
// 이 파일은 오직 두 가지만 한다: useSQLiteContext로 db를 얻고, CalendarGridScreen에
// 넘긴다. 화면 JSX·스타일·state·데이터 조회를 이 파일에 절대 넣지 않는다
// ((tabs)/index/[id].tsx와 동일한 얇은 래퍼 계약, 05-RESEARCH.md §Recommended
// Project Structure).
import { useSQLiteContext } from 'expo-sqlite';
import { CalendarGridScreen } from '../../../calendar/CalendarGridScreen';

export default function CalendarIndexRoute() {
  const db = useSQLiteContext();
  return <CalendarGridScreen db={db} />;
}
