// src/calendar/scrubberRange.ts
// 06-02-PLAN.md Task 3 — 플로팅 날짜 스크러버의 범위 생성 · 하드 클램프 · 가시성 게이트 +
// 확정 치수 상수.
//
// monthGrid.ts와 동일한 순수 모듈 계약이다 — 네이티브 모듈을 import하지 않으므로
// @jest-environment node에서도 로드 가능하다.
//
// 치수 상수를 이 파일이 소유한다 — 컴포넌트에 숫자 리터럴을 흩뿌리지 않는다.
import { resolveLocalDateKey } from '../checkin/localDate';

// docs/designs/calendar-date-scrubber.md Premise 8 — 카드 하단 오프셋 = CLOSED 시트 피크
// 높이 100pt + 여백 32pt.
export const SCRUBBER_BOTTOM_OFFSET_PT = 132;

// calendar-date-scrubber.md Premise 8 — 표준 iOS 네비게이션 바 높이(세이프 에어리어 별도).
export const SCRUBBER_HEADER_HEIGHT_PT = 44;

// calendar-date-scrubber.md Premise 12 — DESIGN.md 44×44pt 터치 타겟 원칙을 눈금 자체가
// 아니라 드래그 표면 전체에 적용한다(T3, Implementation Tasks).
export const SCRUBBER_TOUCH_SURFACE_HEIGHT_PT = 44;

// calendar-date-scrubber.md Premise 11 — 기록 있는 날이 0~1일이면 훑어볼 게 없으므로
// 스크러버 자체를 숨긴다.
export const SCRUBBER_MIN_DISTINCT_DATES = 2;

// 06-CONTEXT.md Claude's Discretion — 원본 calendar-date-scrubber.md에는 없는 값(Open
// Questions "시각적 스크롤 창 크기는 Claude 재량"). 24px 간격이면 일반적인 iPhone 폭
// (약 390pt)에서 카드 안에 좌우 약 7일씩 보인다.
export const SCRUBBER_TICK_SPACING_PX = 24;

function toUtcDayIndex(dateKey: string): number {
  const [year, month, day] = dateKey.split('-').map((part) => Number(part));
  return Math.floor(Date.UTC(year, month - 1, day) / (24 * 60 * 60 * 1000));
}

// 두 키를 Date.UTC 기준 정수 일수로 바꿔 하루씩 증가시키며 resolveLocalDateKey(..., 'UTC')로
// 키를 만든다(monthGrid.ts와 동일 규약, 수동 문자열 산수 금지). 시작 > 끝이면 빈 배열
// (throw 아님) — 호출자가 첫 체크인 날짜/오늘을 그대로 넘겨도 안전하다.
export function buildScrubberDateKeys(
  earliestDateKey: string,
  todayDateKey: string
): string[] {
  const startDay = toUtcDayIndex(earliestDateKey);
  const endDay = toUtcDayIndex(todayDateKey);
  if (startDay > endDay) return [];

  const keys: string[] = [];
  for (let day = startDay; day <= endDay; day++) {
    keys.push(resolveLocalDateKey(new Date(day * 24 * 60 * 60 * 1000), 'UTC'));
  }
  return keys;
}

export function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}

// 부호 규약(calendar-date-scrubber.md Premise 9): 눈금 쪽이 손가락을 따라 움직이고
// 중앙 인디케이터는 고정이다 — 그래서 오른쪽으로 드래그(양수 translationX)하면 눈금이
// 오른쪽으로 밀리면서 더 이전 날짜가 중앙 인디케이터 아래로 온다(인덱스 감소). 감쇠/
// 스프링/관성 항을 절대 넣지 않는다(Premise 10, 모멘텀 없음) — clampIndex의 하드
// 클램프가 경계에서 러버밴딩 없이 즉시 멈추게 한다.
export function indexForTranslation(
  startIndex: number,
  translationX: number,
  length: number,
  tickSpacingPx: number = SCRUBBER_TICK_SPACING_PX
): number {
  return clampIndex(startIndex - Math.round(translationX / tickSpacingPx), length);
}

export function shouldShowScrubber(distinctDateCount: number): boolean {
  return distinctDateCount >= SCRUBBER_MIN_DISTINCT_DATES;
}
