// src/checkin/localDate.ts
// 03-04-PLAN.md Task 1 — Intl 기반 local_date_key/timezone/ISO 타임스탬프 생성.
//
// 이 파일은 순수 함수 모듈이다 — 네이티브 모듈을 import하지 않으므로
// Node 테스트 환경(@jest-environment node)에서도 그대로 로드 가능하다
// (src/checkin/fallbackLocation.ts와 동일 성격).
//
// 수동 `Date` 파싱이나 UTC 오프셋 산수를 절대 쓰지 않는다 — 자정 경계 버그를 막으려고
// 만든 컬럼(local_date_key)인데 계산 자체가 버그면 본말전도다
// (03-RESEARCH.md §Don't Hand-Roll 원문). 대신 `Intl.DateTimeFormat`이 타임존 변환을
// 전담한다. Hermes는 Expo SDK 46+부터 풀 ICU/`Intl`을 기본 활성화하므로 실기기에서도
// 동작한다(03-RESEARCH.md §Don't Hand-Roll 근거).

export function resolveTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// `en-CA`(캐나다 영어) 로케일을 쓰는 이유: Intl.DateTimeFormat이 지원하는 로케일 중
// en-CA가 YYYY-MM-DD(ISO 8601과 동일한 순서)를 표준 짧은 날짜 형식으로 반환하는
// 몇 안 되는 로케일이다 — 별도의 문자열 재조합 없이 그대로 local_date_key로 쓸 수 있다.
export function resolveLocalDateKey(
  date: Date,
  timeZone: string = resolveTimeZone()
): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(date);
}

export function toIsoTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}
