// src/settings/config.ts
// Plan 06-01 Task 2 — 설정 화면 도메인 타입/상수 단일 출처. 여기서 값을 발명하지 않는다
// (src/checkin/config.ts / src/notifications/config.ts와 동일 규약).
//
// 런타임 import를 두지 않는다 — 이 파일은 순수 상수만 담는다.

// 03-CONTEXT.md D-04의 DRAFT_ROW_ID와 동일한 근거: app_settings는 단일 row만 유지하는
// 고정 PK를 쓴다. 'settings'라는 상수 하나로 고정해, 스키마 레벨 PRIMARY KEY 제약이
// "row는 항상 최대 1개"를 강제하도록 한다.
export const SETTINGS_ROW_ID = 'settings';
