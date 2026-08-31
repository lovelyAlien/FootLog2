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
// [id] 스크린(체크인 상세화면)은 아직 등록하지 않는다 — 이 시점에는 해당 라우트
// 파일이 존재하지 않는다. 05-03-PLAN.md가 [id].tsx를 만들면서 여기에 함께 등록한다.
//
// src/app/(tabs)/_layout.tsx(형제 Tabs 레이아웃)는 이 이동으로 바뀌지 않는다 —
// expo-router는 (tabs)/index/index.tsx를 여전히 "index" 세그먼트로 매칭한다
// (폴더명이 파일명 대신 세그먼트를 대표하기 때문).
import { Stack } from 'expo-router';

export default function TodayStackLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}
