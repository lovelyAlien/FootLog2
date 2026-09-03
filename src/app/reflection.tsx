// src/app/reflection.tsx
// 07-08-PLAN.md Task 1 — 회고 모달 라우트, 얇은 래퍼.
//
// (tabs)/index/settings.tsx와 동일한 계약: 이 파일은 SQLite 컨텍스트 훅으로 db를
// 얻어 화면 본체 컴포넌트에 넘기는 것만 한다. 화면 JSX·스타일·state·데이터 조회를
// 이 파일에 절대 넣지 않는다 — 화면 본체는 07-05가 만든 src/reflection/ 도메인
// 디렉토리 안의 컴포넌트다.
import { useSQLiteContext } from 'expo-sqlite';
import { ReflectionModal } from '../reflection/ReflectionModal';

export default function ReflectionRoute() {
  const db = useSQLiteContext();
  return <ReflectionModal db={db} />;
}
