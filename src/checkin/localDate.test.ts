/**
 * @jest-environment node
 */
// src/checkin/localDate.test.ts
// 03-04-PLAN.md Task 1 (RED) — Intl 기반 날짜 키/타임존 헬퍼 계약 검증.
// resolveLocalDateKey 테스트는 반드시 timeZone 인자를 명시적으로 넘겨
// CI/로컬 머신 타임존에 의존하지 않게 한다.

import { formatLocalTime, resolveLocalDateKey, resolveTimeZone, toIsoTimestamp } from './localDate';

describe('resolveLocalDateKey', () => {
  it('UTC 정오를 Asia/Seoul로 변환하면 같은 날짜(YYYY-MM-DD)를 반환한다', () => {
    expect(resolveLocalDateKey(new Date('2026-08-27T12:00:00Z'), 'Asia/Seoul')).toBe(
      '2026-08-27'
    );
  });

  it('자정 경계: UTC 16시를 Asia/Seoul로 변환하면 다음날 날짜를 반환한다', () => {
    expect(resolveLocalDateKey(new Date('2026-08-27T16:00:00Z'), 'Asia/Seoul')).toBe(
      '2026-08-28'
    );
  });

  it('America/New_York 타임존에서도 같은 날짜를 반환한다', () => {
    expect(
      resolveLocalDateKey(new Date('2026-08-27T12:00:00Z'), 'America/New_York')
    ).toBe('2026-08-27');
  });
});

describe('resolveTimeZone', () => {
  it('비어 있지 않은 IANA 타임존 문자열을 반환한다', () => {
    const tz = resolveTimeZone();
    expect(typeof tz).toBe('string');
    expect(tz.length).toBeGreaterThan(0);
  });
});

describe('toIsoTimestamp', () => {
  it('Date를 ISO 8601 문자열로 변환한다', () => {
    expect(toIsoTimestamp(new Date('2026-08-27T12:00:00Z'))).toBe(
      '2026-08-27T12:00:00.000Z'
    );
  });
});

describe('formatLocalTime', () => {
  it('UTC 자정을 Asia/Seoul(UTC+9)로 변환하면 09:21을 반환한다', () => {
    expect(formatLocalTime('2026-08-30T00:21:00.000Z', 'Asia/Seoul')).toBe('09:21');
  });

  it('자정 경계: UTC 15시를 Asia/Seoul로 변환하면 24:00이 아니라 00:00을 반환한다', () => {
    expect(formatLocalTime('2026-08-30T15:00:00.000Z', 'Asia/Seoul')).toBe('00:00');
  });

  it('한 자리 시/분이 0으로 패딩된다(UTC 기준)', () => {
    expect(formatLocalTime('2026-08-30T04:05:00.000Z', 'UTC')).toBe('04:05');
  });

  it('같은 UTC 타임스탬프도 타임존에 따라 다른 값을 반환한다', () => {
    const seoul = formatLocalTime('2026-08-30T04:05:00.000Z', 'Asia/Seoul');
    const utc = formatLocalTime('2026-08-30T04:05:00.000Z', 'UTC');
    expect(seoul).not.toBe(utc);
  });
});
