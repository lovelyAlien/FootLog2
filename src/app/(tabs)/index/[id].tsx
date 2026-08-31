// src/app/(tabs)/index/[id].tsx
// 05-03-PLAN.md Task 1 — 체크인 상세 라우트, 얇은 래퍼.
//
// 이 파일은 오직 세 가지만 한다: useLocalSearchParams로 id를 읽고, useSQLiteContext로
// db를 얻고, CheckinDetailScreen에 넘긴다. 화면 JSX·스타일·state·데이터 조회를 이
// 파일에 절대 넣지 않는다. Phase 6(캘린더 과거 날짜 뷰)은 (tabs)/calendar/...라는
// 다른 탭의 다른 nested stack에서 진입하므로 이 라우트 파일을 그대로 push할 수 없고,
// 반드시 별도 라우트 파일에서 같은 CheckinDetailScreen을 import해야 한다 — 화면
// 본체가 라우트 파일 안에 있으면 Phase 6이 전체를 복제하게 된다(05-RESEARCH.md
// §Recommended Project Structure).
import { useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CheckinDetailScreen } from '../../../checkin/CheckinDetailScreen';

export default function CheckinDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const db = useSQLiteContext();
  return <CheckinDetailScreen db={db} checkinId={id} />;
}
