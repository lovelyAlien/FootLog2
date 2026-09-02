// src/calendar/monthGrid.ts
// 06-02-PLAN.md Task 2 — 캘린더 탭 월 그리드 셀 생성, 월 이동, 헤더 포맷, date key 검증.
//
// 이 파일은 src/checkin/localDate.ts와 동일하게 네이티브 모듈을 import하지 않는 순수
// 함수 모듈이다 — Node 테스트 환경(@jest-environment node)에서도 그대로 로드 가능하다.
//
// 월 이동/셀 열거는 타임존 변환이 아니라 달력 좌표 계산이다 — 그래서 사용자 로컬
// 타임존을 여기 섞지 않고 Date.UTC + timeZone: 'UTC' 고정으로 수행한다. 사용자 로컬
// 타임존을 섞으면 월 경계가 기기 시각(자정 근처)에 따라 흔들릴 수 있다.
import { resolveLocalDateKey } from '../checkin/localDate';

export type YearMonth = { year: number; month: number }; // month: 1~12

export type MonthGridCell = {
  dateKey: string;
  dayOfMonth: number;
  inCurrentMonth: boolean;
};

export const WEEKDAY_COUNT = 7;

// 주 시작 요일 = 일요일(D-06, 06-CONTEXT.md — iOS 기본 달력 앱의 한국 로케일 관례와 일치).
// getUTCDay()는 일요일을 0으로 반환하므로 이 상수와 그대로 맞아떨어진다.
const WEEK_START_DAY = 0;

function utcDateKey(year: number, monthIndex: number, day: number): string {
  return resolveLocalDateKey(new Date(Date.UTC(year, monthIndex, day)), 'UTC');
}

function daysInMonth(year: number, monthIndex: number): number {
  // monthIndex+1, day 0 = 그 달의 마지막 날(0-index 트릭, UTC 고정이라 로컬 타임존
  // 영향을 받지 않는다).
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function buildMonthGrid(ym: YearMonth): MonthGridCell[] {
  const monthIndex = ym.month - 1;
  const firstOfMonth = new Date(Date.UTC(ym.year, monthIndex, 1));
  const firstWeekday = firstOfMonth.getUTCDay(); // 일요일 = 0
  const leadingPadding = (firstWeekday - WEEK_START_DAY + WEEKDAY_COUNT) % WEEKDAY_COUNT;
  const totalDaysInMonth = daysInMonth(ym.year, monthIndex);

  const totalCellsBeforePadding = leadingPadding + totalDaysInMonth;
  const totalWeeks = Math.ceil(totalCellsBeforePadding / WEEKDAY_COUNT);
  const totalCells = totalWeeks * WEEKDAY_COUNT;

  const cells: MonthGridCell[] = [];
  // 그리드의 0번 인덱스에 해당하는 절대 날짜(달력 좌표) = 이 달 1일 - leadingPadding일.
  const gridStart = new Date(Date.UTC(ym.year, monthIndex, 1 - leadingPadding));

  for (let i = 0; i < totalCells; i++) {
    const cellDate = new Date(gridStart.getTime() + i * 24 * 60 * 60 * 1000);
    const dateKey = resolveLocalDateKey(cellDate, 'UTC');
    cells.push({
      dateKey,
      dayOfMonth: cellDate.getUTCDate(),
      inCurrentMonth:
        cellDate.getUTCFullYear() === ym.year && cellDate.getUTCMonth() === monthIndex,
    });
  }

  return cells;
}

export function monthRangeBounds(ym: YearMonth): {
  startDateKey: string;
  endDateKey: string;
} {
  const monthIndex = ym.month - 1;
  const lastDay = daysInMonth(ym.year, monthIndex);
  return {
    startDateKey: utcDateKey(ym.year, monthIndex, 1),
    endDateKey: utcDateKey(ym.year, monthIndex, lastDay),
  };
}

export function shiftMonth(ym: YearMonth, delta: number): YearMonth {
  const zeroBasedTotal = ym.year * 12 + (ym.month - 1) + delta;
  const year = Math.floor(zeroBasedTotal / 12);
  const month = (zeroBasedTotal % 12) + 1;
  return { year, month };
}

// ko-KR + timeZone: 'UTC' — localDate.ts의 formatLocalMonthDay가 ko-KR을 고른 것과 같은
// 근거: 이 문자열은 사용자에게 그대로 노출되는 한국어 문구다. 월 이름 배열을 하드코딩하지
// 않는다.
export function formatMonthHeader(ym: YearMonth): string {
  const date = new Date(Date.UTC(ym.year, ym.month - 1, 1));
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
  });
  return formatter.format(date);
}

export function yearMonthOf(dateKey: string): YearMonth {
  const [year, month] = dateKey.split('-').map((part) => Number(part));
  return { year, month };
}

export function formatDateKeyTitle(dateKey: string): string {
  const { year, month } = yearMonthOf(dateKey);
  const day = Number(dateKey.split('-')[2]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  return formatter.format(date);
}

// T-06-02 — 이 함수가 calendar/[date] 라우트 파라미터의 유일한 방어선이다(06-04가 쿼리
// 전에 반드시 호출). YYYY-MM-DD 정규식 통과 + Date.UTC로 재구성한 값이 원문과 round-trip
// 일치하는지까지 확인해 2026-02-30 같은 존재하지 않는 날짜를 fail-closed로 거부한다.
export function isValidLocalDateKey(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [yearStr, monthStr, dayStr] = value.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const roundTrip = utcDateKey(year, month - 1, day);
  return roundTrip === value;
}
