// src/checkin/location.ts
// 03-07-PLAN.md — 체크인 위치 캡처의 결정 트리를 순수 함수로 구현한다: 권한 판정 →
// 5초 타임아웃 레이스 → OS 캐시 폴백 → 앱 소유 3단계 폴백 체인, location_source 확정.
//
// config.ts 헤더 규약과 동일하게 이 파일은 'expo-location'을 런타임 import 하지 않는다
// (deps.ts가 유일한 런타임 import 지점) — @jest-environment node 유닛 테스트가 네이티브
// 모듈을 로드하지 않고도 이 결정 트리 전체를 검증할 수 있게 한다(03-RESEARCH.md
// Architecture Patterns Pattern 1).
import type { LocationDeps } from './config';
import { CAPTURE_TIMEOUT_MS, LAST_KNOWN_MAX_AGE_MS, LOCATION_ACCURACY_BALANCED } from './config';
import { defaultLocationDeps } from './deps';

export type Coordinate = { lat: number; lng: number; accuracyMeters: number | null };

export type CaptureResult =
  | ({ kind: 'auto' } & Coordinate)
  | ({ kind: 'timeout_os_cache' } & Coordinate)
  | { kind: 'need_fallback_chain' };

// GPS 프로미스와 타임아웃 프로미스의 경합 결과를 나타내는 내부 판별 유니온.
type RaceOutcome =
  | { tag: 'gps'; pos: Awaited<ReturnType<LocationDeps['getCurrentPositionAsync']>> }
  | { tag: 'gps_error' }
  | { tag: 'timer' };

// captureWithTimeout(deps, timeoutMs)의 timeoutMs는 프로덕션 기본값(CAPTURE_TIMEOUT_MS)을
// 테스트가 짧은 값으로 교체할 수 있게 하는 두 번째 선택 인자다 — jest fake timer +
// Promise 조합보다 단순하고 결정적이다(03-07-PLAN.md Task 1 action 문단이 권장한 방식,
// SUMMARY에 채택 근거 기록).
export async function captureWithTimeout(
  deps: LocationDeps = defaultLocationDeps,
  timeoutMs: number = CAPTURE_TIMEOUT_MS
): Promise<CaptureResult> {
  // getCurrentPositionAsync에 `timeout` 옵션을 절대 넣지 않는다 — 공식 LocationOptions
  // 타입에 없는 필드이며 구버전 API에서는 예외를 던진다(03-RESEARCH.md Pitfall 1,
  // GitHub expo/expo#2226). 브라우저 Geolocation API의 timeout 옵션과 혼동하기 쉬운
  // 지점이라 여기 명시한다.
  const positionPromise = deps.getCurrentPositionAsync({ accuracy: LOCATION_ACCURACY_BALANCED });

  // positionPromise의 rejection 핸들러를 여기서 동기적으로 붙여둔다(.then의 두 번째
  // 인자) — 이렇게 하면 positionPromise 자체가 나중에 reject되더라도 이미 처리된
  // 상태라 unhandled rejection이 발생하지 않는다.
  const gpsOutcome: Promise<RaceOutcome> = positionPromise.then(
    (pos) => ({ tag: 'gps', pos }) as const,
    () => ({ tag: 'gps_error' }) as const
  );

  let timer: ReturnType<typeof setTimeout>;
  const timerOutcome = new Promise<RaceOutcome>((resolve) => {
    timer = setTimeout(() => resolve({ tag: 'timer' }), timeoutMs);
  });

  const winner = await Promise.race([gpsOutcome, timerOutcome]);
  // Jest가 열린 타이머 핸들 때문에 종료를 지연하지 않도록 반드시 정리한다.
  clearTimeout(timer!);

  if (winner.tag === 'gps') {
    return {
      kind: 'auto',
      lat: winner.pos.coords.latitude,
      lng: winner.pos.coords.longitude,
      accuracyMeters: winner.pos.coords.accuracy,
    };
  }

  // 타임아웃이 이겼거나 GPS 프로미스가 reject된 경우 — 버려진 원본 프로미스에
  // .catch(() => {})를 붙여 지연 응답을 흡수한다. 이미 위 gpsOutcome이 rejection을
  // 처리했으므로 엄밀히는 중복이지만, "이미 타임아웃 처리를 끝낸 뒤의 지연 응답이므로
  // 명시적으로 버린다"는 의도를 코드로도 남기기 위한 repo 규약("프로미스를 조용히
  // 삼키지 않는다")의 명시적 예외다(03-RESEARCH.md Pattern 2).
  positionPromise.catch(() => {});

  try {
    const cached = await deps.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
    if (cached) {
      return {
        kind: 'timeout_os_cache',
        lat: cached.coords.latitude,
        lng: cached.coords.longitude,
        accuracyMeters: cached.coords.accuracy,
      };
    }
  } catch {
    // getLastKnownPositionAsync 자체가 실패해도 폴백 체인으로 넘어간다 —
    // OS 캐시 조회 실패는 need_fallback_chain으로 흡수한다.
  }

  return { kind: 'need_fallback_chain' };
}
