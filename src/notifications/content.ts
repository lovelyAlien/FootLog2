// src/notifications/content.ts
// Source: 02-UI-SPEC.md Copywriting Contract("실제 발송되는 알림 콘텐츠" 행) +
// docs/designs/day-end-reflection-map.md 확정 섹션명 — 문구를 여기서 발명하지 않고
// 승인된 문서에서 그대로 전사한다(tokens.ts 헤더 규약과 동일 원칙).
//
// 부가 설명 필드는 두 항목 모두 두지 않는다 — 두 원본 문서 모두 "고정 문구 하나"로
// 명시하며, 확정되지 않은 부가 문구를 여기서 창작하지 않는다.
export const NOTIFICATION_CONTENT = {
  checkin: { title: '체크인할 시간이에요' },
  dailyReflection: { title: '오늘 돌아보기' },
} as const;
