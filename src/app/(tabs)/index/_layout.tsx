// src/app/(tabs)/index/_layout.tsx
// 2026-09-01 신설(05-01-PLAN.md Task 1) — 오늘 탭 전용 nested Stack. expo-router는
// 탭 폴더 밖으로 push하면 Tabs 네비게이터 전체(탭바 포함)가 화면에서 사라진다. 오늘
// 탭 안에서 상세화면을 push하면서도 탭바를 계속 보이게 하려면 이 탭 세그먼트 자체를
// _layout.tsx(Stack)를 가진 서브 디렉토리로 만들어야 한다(05-RESEARCH.md Pattern 1,
// Expo 공식 문서 "nesting a stack navigator inside of a tab" 패턴으로 검증됨).
//
// 이 Stack은 루트 src/app/_layout.tsx의 screenOptions={{ headerShown: false }}를
// 상속하지 않는 별도 Stack 인스턴스다(05-RESEARCH.md Pitfall 2) — 그래서 index
// 스크린에 headerShown: false를 명시하지 않으면 오늘 뷰 최상단에 의도치 않은 빈
// 네비게이션 바가 생긴다.
//
// [id] 스크린(체크인 상세화면)은 2026-09-01 05-03-PLAN.md Task 1이 등록한다 —
// headerShown: true를 여기서 **명시**하는 이유: 이 Stack은 위에서 설명한 대로 루트의
// screenOptions={{ headerShown: false }}를 상속하지 않는 별도 인스턴스이고, 반대로
// 같은 Stack 안의 index 스크린은 headerShown: false다 — 그래서 기본값에 기댈 수 없고
// 스크린마다 명시해야 한다(05-RESEARCH.md Pitfall 2). title은 여기서 정적으로 지정하지
// 않는다 — 체크인마다 다른 로컬 날짜라서 CheckinDetailScreen이 데이터 로드 후
// navigation.setOptions로 채운다.
//
// settings 스크린은 2026-09-01 06-06-PLAN.md Task 1이 등록한다 — 이 화면을 별도
// 라우트 그룹이 아니라 이 Today 탭의 nested Stack 안에 두는 이유: 이 Stack은
// (tabs)/_layout.tsx의 Tabs 네비게이터 자식이므로, 여기서 push해도 탭바가 계속
// 보인다(설정 화면은 체크인 상세화면과 동급 — 둘 다 탭바를 유지하는 push 화면,
// D-07). title은 SETTINGS_COPY.screenTitle(단일 출처, src/settings/content.ts)을
// 그대로 쓴다 — 화면 본체가 navigation.setOptions로 다시 덮어쓰지 않는다는 점에서
// [id] 스크린과 다르다(체크인마다 달라지는 동적 제목이 없기 때문). 탭바 관련
// 네비게이터 옵션은 여기서도, settings.tsx/SettingsScreen.tsx 어디서도 절대
// 조작하지 않는다 — 탭바 유지가 기본 동작이라 손댈 이유가 없다.
//
// src/app/(tabs)/_layout.tsx(형제 Tabs 레이아웃)는 이 이동으로 바뀌지 않는다 —
// expo-router는 (tabs)/index/index.tsx를 여전히 "index" 세그먼트로 매칭한다
// (폴더명이 파일명 대신 세그먼트를 대표하기 때문).
import { Stack } from 'expo-router';
import { SETTINGS_COPY } from '../../../settings/content';

export default function TodayStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[id]" options={{ headerShown: true }} />
      <Stack.Screen
        name="settings"
        options={{ headerShown: true, title: SETTINGS_COPY.screenTitle }}
      />
    </Stack>
  );
}
