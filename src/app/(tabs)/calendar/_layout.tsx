// src/app/(tabs)/calendar/_layout.tsx
// 06-03-PLAN.md Task 1 — 캘린더 탭 전용 nested Stack. (tabs)/index/_layout.tsx와
// 동일한 근거(05-01-PLAN.md Task 1, 05-RESEARCH.md Pattern 1) — expo-router는 탭
// 폴더 밖으로 push하면 Tabs 네비게이터 전체(탭바 포함)가 화면에서 사라지므로,
// 캘린더 탭 안에서 과거 날짜 화면을 push하면서도 탭바를 계속 보이게 하려면 이 탭
// 세그먼트 자체를 _layout.tsx(Stack)를 가진 서브 디렉토리로 만들어야 한다.
//
// 이 Stack은 루트 src/app/_layout.tsx의 screenOptions={{ headerShown: false }}를
// 상속하지 않는 별도 Stack 인스턴스다(05-RESEARCH.md Pitfall 2와 동일 함정) —
// 그래서 index 스크린에 headerShown: false를 명시하지 않으면 월 그리드 화면
// 최상단에 의도치 않은 빈 네비게이션 바가 생긴다.
//
// 과거 날짜 뷰 동적 라우트 스크린 등록은 그 라우트 파일이 실제로 생기는 06-04에서
// 추가한다 — 존재하지 않는 라우트를 미리 등록하지 않는다.
import { Stack } from 'expo-router';

export default function CalendarStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
