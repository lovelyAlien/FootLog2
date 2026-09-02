// src/app/(tabs)/index/settings.tsx
// 06-06-PLAN.md Task 1 — 설정 라우트, 얇은 래퍼.
//
// [id].tsx와 동일한 계약: 이 파일은 useSQLiteContext로 db를 얻고 SettingsScreen에
// 넘기는 것만 한다. 화면 JSX·스타일·state·데이터 조회를 이 파일에 절대 넣지 않는다.
// useLocalSearchParams는 쓰지 않는다 — 이 라우트는 파라미터를 받지 않는다.
import { useSQLiteContext } from 'expo-sqlite';
import { SettingsScreen } from '../../../settings/SettingsScreen';

export default function SettingsRoute() {
  const db = useSQLiteContext();
  return <SettingsScreen db={db} />;
}
