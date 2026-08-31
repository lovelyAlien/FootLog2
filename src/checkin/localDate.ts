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

// 04-04-PLAN.md Task 2 — 바텀시트 리스트 행의 시간 표시(`09:21` 형태).
// 아래 옵션에서 24시간제 사이클을 명시하는 이유: 지정하지 않으면 로케일에 따라
// 자정을 24시로 표기하거나(en-GB 로케일도 미지정 시 환경별로 갈릴 수 있음) 12시간제로
// 표기할 위험이 있다 — 이 리스트 행에는 오전/오후 구분이 없으므로 24시간제(00~23시)를
// 강제해 자정이 항상 00시로, 오후가 항상 24시간제 숫자로 나오게 고정한다.
// 이 파일의 기존 계약과 동일하게 수동 시/분 추출 함수나 문자열 슬라이싱을 쓰지 않고
// Intl.DateTimeFormat에 타임존 변환을 전담시킨다.
export function formatLocalTime(
  isoTimestamp: string,
  timeZone: string = resolveTimeZone()
): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(isoTimestamp));
}

// 05-02-PLAN.md Task 2 — 체크인 상세화면 헤더 타이틀(예: "8월 31일"). `ko-KR` 로케일을
// 쓰는 이유: 이 문자열은 formatLocalTime과 달리 시간 표시가 아니라 사용자에게 한국어로
// 그대로 노출되는 문구다 — "8월 31일" 같은 한국어 월/일 표기를 얻으려면 en-GB/en-CA가
// 아니라 ko-KR이 필요하다(이 파일의 en-CA/en-GB 로케일 선택 근거를 남기는 기존 관례를
// 그대로 따른 것). 수동 Date 파싱/문자열 슬라이싱/월 이름 배열 하드코딩을 쓰지 않고
// Intl.DateTimeFormat이 타임존 변환과 로케일 표기를 전담한다(이 파일 상단 규약).
export function formatLocalMonthDay(
  isoTimestamp: string,
  timeZone: string = resolveTimeZone()
): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone,
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoTimestamp));
}
