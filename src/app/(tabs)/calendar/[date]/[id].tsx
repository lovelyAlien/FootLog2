// src/app/(tabs)/calendar/[date]/[id].tsx
// 06-05-PLAN.md Task 1 — Phase 5 상세화면을 캘린더 스택에서 재사용하기 위한 두 번째
// 진입점이며, 화면 로직은 한 곳((tabs)/index/[id].tsx가 import하는 CheckinDetailScreen)에만
// 존재한다.
//
// 이 파일은 (tabs)/index/[id].tsx와 동일한 형태로 오직 세 가지만 한다:
// useLocalSearchParams로 id를 읽고, useSQLiteContext로 db를 얻고,
// CheckinDetailScreen에 넘긴다. 화면 본체를 복제하지 않는다 — Phase 6은
// (tabs)/calendar/...라는 다른 탭의 다른 nested stack에서 진입하므로 Phase 5의
// 라우트 파일을 그대로 push할 수 없어 별도 라우트 파일이 필요하지만, import하는
// 컴포넌트는 동일하다.
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CheckinDetailScreen } from '../../../../checkin/CheckinDetailScreen';

export default function CalendarCheckinDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  return <CheckinDetailScreen db={db} checkinId={id} />;
}
