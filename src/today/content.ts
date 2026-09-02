// src/today/content.ts
// Source: 04-UI-SPEC.md §Copywriting Contract, §네비게이션 탭바 — 문구를 여기서
// 발명하지 않고 승인된 문서에서 그대로 전사한다(src/notifications/content.ts와
// 동일한 규약).
export const TODAY_COPY = {
  tabToday: '오늘',
  tabCalendar: '캘린더',
  // 캘린더 탭 플레이스홀더 문구 키는 06-03-PLAN.md Task 1에서 제거됐다 — Phase 6이
  // 플레이스홀더 화면을 실제 월 그리드(CalendarGridScreen)로 교체하면서 이 키의
  // 유일한 소비자였던 (tabs)/calendar.tsx 자체가 사라졌다.
  // 04-UI-SPEC.md §Copywriting Contract — 바텀시트 empty state. 가운뎃점은 U+00B7 `·`.
  emptyState: '아직 기록이 없어요 · 체크인하면 지도가 채워져요',
  // 05-UI-SPEC.md §Copywriting Contract / §Undo 스낵바 — 스와이프 삭제 4초 undo
  // 스낵바 문구. 여기서 문구를 발명하지 않고 승인된 문서에서 그대로 전사한다.
  deletedSnackbar: '삭제했어요',
  undoCta: '실행취소',
  deleteAffordanceLabel: '삭제',
} as const;
