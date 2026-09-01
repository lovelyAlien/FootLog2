// src/app/(tabs)/_layout.tsx
// Phase 4(04-03-PLAN.md Task 1) — 하단 탭바 셸(RootTabNavigator, D-06). "오늘"/
// "캘린더" 2탭만 두고, 캘린더 탭은 플레이스홀더 화면(D-07)에 연결한다. 설정 화면
// 진입점(햄버거 ≡)은 이 phase에서 만들지 않는다(D-08) — 세 번째 탭 화면이나
// headerRight를 두지 않는다.
//
// 색상 오버라이드가 선택 사항이 아닌 이유: expo-router의 Tabs를 커스텀 설정 없이
// 그대로 쓰면 활성 탭 틴트가 iOS 시스템 파란색(네비게이션 테마 기본값)으로
// 렌더된다 — DESIGN.md의 "액센트 1개(올리브그린), 빨강/파랑 계열 배제" 원칙과
// 정면 충돌하는 놓치기 쉬운 기본값 함정이다(04-UI-SPEC.md §네비게이션 탭바).
// accent 토큰은 탭 강조에 쓰지 않는다 — accent 예산은 체크인 버튼과 지도
// 마크에만 쓴다(04-UI-SPEC.md §Color, Accent 예산 확인).
import { Tabs } from 'expo-router';
import { colors } from '../../theme/tokens';
import { TODAY_COPY } from '../../today/content';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.line,
          borderTopWidth: 1,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: TODAY_COPY.tabToday }} />
      <Tabs.Screen name="calendar" options={{ title: TODAY_COPY.tabCalendar }} />
    </Tabs>
  );
}
