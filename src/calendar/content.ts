// src/calendar/content.ts
// Source: 06-UI-SPEC.md §Copywriting Contract — 문구를 여기서 발명하지 않고
// 승인된 문서에서 그대로 전사한다(src/today/content.ts와 동일한 규약). 이 phase의
// 캘린더 관련 문구를 전부 여기 담아, 이후 06-04/06-05/06-06/06-07 플랜이 이 파일을
// 다시 수정하지 않아도 되게 한다.
export const CALENDAR_COPY = {
  // D-06 — 한 주는 일요일부터 시작한다(iOS 기본 달력 앱의 한국 로케일 관례와 일치).
  weekdayHeaders: ['일', '월', '화', '수', '목', '금', '토'],
  // 아이콘 전용 헤더 화살표 버튼의 VoiceOver 라벨(D-05 접근성 보조 경로).
  prevMonthLabel: '이전 달',
  nextMonthLabel: '다음 달',
  // 오늘 뷰의 TODAY_COPY.emptyState("아직 기록이 없어요 · 체크인하면 지도가
  // 채워져요")와 의도적으로 다르다 — 과거 날짜에는 새 체크인을 남길 수 없어
  // "체크인하면 채워져요"라는 CTA 자체가 성립하지 않는다(06-UI-SPEC.md §Copywriting
  // Contract).
  pastDateEmptyState: '이 날은 기록이 없어요',
  // docs/designs/calendar-date-scrubber.md Visual Design Decisions 원문 그대로.
  // 가운뎃점은 U+00B7 `·`. 폰트 크기만 11px→13px로 조정됐을 뿐(06-UI-SPEC.md
  // Typography, 사용자 승인 2026-09-01) 문구 자체는 변경하지 않는다.
  scrubberCaption: '← 드래그해서 날짜 이동 → · 오늘 이후로는 못 넘어감',
} as const;
