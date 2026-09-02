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
// 과거 날짜 뷰 동적 라우트 스크린 2개는 06-05-PLAN.md Task 1이 여기서 등록한다.
//
// `calendar/[date].tsx`(플랫 파일) + `calendar/[id].tsx` 조합을 쓰지 않고
// `calendar/[date]/index.tsx` + `calendar/[date]/[id].tsx`로 중첩한 이유: 같은
// 레벨의 동적 세그먼트 두 개(`[date]`와 `[id]`가 나란히)는 `/calendar/<무언가>`를
// 날짜인지 체크인 id인지 라우터가 구분할 수 없어 라우트가 모호해진다. 중첩하면
// 상세 경로가 `/calendar/2026-09-01/<id>`가 되어 "어느 날짜에서 들어온 상세인지"까지
// URL이 표현한다.
//
// 두 화면 모두 title은 여기서 정적으로 주지 않는다 — 각 화면이 데이터 로드 후
// navigation.setOptions로 채운다((tabs)/index/_layout.tsx의 [id] 주석과 동일 근거).
// `[date]/index`의 headerShown: true는 calendar-date-scrubber.md Premise 8이 명시한
// 44pt 헤더다.
import { Stack } from 'expo-router';

export default function CalendarStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[date]/index" options={{ headerShown: true }} />
      <Stack.Screen name="[date]/[id]" options={{ headerShown: true }} />
    </Stack>
  );
}
