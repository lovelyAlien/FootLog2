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
import type { PermissionSnapshot } from './permissions';
import { FALLBACK_COORDINATE, isValidCoordinate } from './fallbackLocation';
import type { LocationSource } from '../db/schema';

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

// ---------------------------------------------------------------------------
// resolveCheckinLocation — 권한 판정 + 3단계 폴백 체인 + location_source 확정
// ---------------------------------------------------------------------------
//
// 확정된 location_source 매핑 (03-RESEARCH.md Open Questions #1 해소).
// 03-UI-SPEC.md §Pin Visual States가 이미 이 매핑을 전제로 3가지 핀 시각 상태를
// 확정했으므로 이 표는 새 결정이 아니라 코드로 못박는 작업이다:
//
// | location_source              | 트리거 조건                                                  |
// |-------------------------------|--------------------------------------------------------------|
// | gps_auto                      | 권한 granted + 5초 내 GPS 성공 + 드래그 없음                 |
// | gps_low_accuracy_fallback     | 권한 granted + 타임아웃 + OS 캐시 반환 + 드래그 없음         |
// | manual_no_signal              | 권한 granted + 타임아웃 + OS 캐시 없음 → 앱 폴백 체인 + 드래그 없음 |
// | manual_denied                 | 권한 granted 아님 → expo-location 미호출 + 앱 폴백 체인 + 드래그 없음 |
// | gps_dragged                   | 위 어느 경로였든 사용자가 핀을 드래그한 모든 경우(원 소스 무관) |
//
// 앱 소유 3단계 폴백 체인 순서: (1) 최근 checkins row 좌표 → (2) 지도 마지막 표시 좌표
// (호출부 인메모리 전달) → (3) FALLBACK_COORDINATE(03-02 창업자 확정값).
export const LOCATION_SOURCE_MAPPING_NOTE =
  'location_source 5개 값 확정 매핑(03-RESEARCH.md Open Questions #1 해소): ' +
  'gps_auto=권한 granted+5초내 GPS 성공+드래그 없음; ' +
  'gps_low_accuracy_fallback=권한 granted+타임아웃+OS 캐시 반환+드래그 없음; ' +
  'manual_no_signal=권한 granted+타임아웃+OS 캐시 없음(앱 폴백 체인)+드래그 없음; ' +
  'manual_denied=권한 granted 아님(앱 폴백 체인, expo-location 미호출)+드래그 없음; ' +
  'gps_dragged=원 소스 무관, 사용자가 핀을 드래그한 모든 경우.';

export type ResolvedLocation = Coordinate & { locationSource: LocationSource };

// 호출부(화면)가 DB/지도 상태를 직접 주입한다 — 이 모듈이 DB나 화면 상태를 직접 읽지
// 않아야 순수 함수/결정적 테스트를 유지할 수 있다.
export type FallbackSources = {
  latestCheckinCoordinate: { lat: number; lng: number } | null;
  lastMapCoordinate: { lat: number; lng: number } | null;
};

// (1) 최근 checkin 좌표 → (2) 지도 마지막 좌표 → (3) FALLBACK_COORDINATE 순서로 첫 번째
// isValidCoordinate 통과 값을 반환한다. FALLBACK_COORDINATE는 03-02의 게이트 테스트가
// 유효성을 이미 보장하므로 최종 반환값이 항상 존재한다.
export function resolveFallbackChain(sources: FallbackSources): { lat: number; lng: number } {
  const candidates = [sources.latestCheckinCoordinate, sources.lastMapCoordinate];
  for (const candidate of candidates) {
    if (candidate && isValidCoordinate(candidate)) {
      return { lat: candidate.lat, lng: candidate.lng };
    }
  }
  return { lat: FALLBACK_COORDINATE.lat, lng: FALLBACK_COORDINATE.lng };
}

// resolveCheckinLocation은 권한 스냅샷을 인자로 받으므로 권한 요청 자체는 하지 않는다 —
// 호출부(화면)가 undetermined 상태일 때 requestLocationPermission을 먼저 호출해 최신
// 스냅샷을 넘긴다는 계약이다(권한 요청 책임은 permissions.ts/03-05가 소유). 방어적으로
// permission.granted !== true인 모든 경우(denied든 undetermined든)를 manual_denied
// 경로로 처리한다.
//
// timeoutMs는 captureWithTimeout에 그대로 전달되는 선택적 테스트 훅이다 — 프로덕션은
// 항상 기본값(CAPTURE_TIMEOUT_MS)을 쓴다.
export async function resolveCheckinLocation(args: {
  permission: PermissionSnapshot;
  deps?: LocationDeps;
  fallbackSources: FallbackSources;
  timeoutMs?: number;
}): Promise<ResolvedLocation> {
  const deps = args.deps ?? defaultLocationDeps;

  // Pitfall 3(03-RESEARCH.md): 권한이 없으면 OS는 마지막 캐시 위치도 내주지 않는다
  // (product-design.md 2026-08-23 Eng 리뷰 정정 이력). 권한이 granted가 아니면 deps의
  // 어떤 함수도 호출하지 않고 곧바로 앱 소유 폴백 체인으로 진입한다.
  if (!args.permission.granted) {
    const coord = resolveFallbackChain(args.fallbackSources);
    return { ...coord, accuracyMeters: null, locationSource: 'manual_denied' };
  }

  const capture = await captureWithTimeout(deps, args.timeoutMs ?? CAPTURE_TIMEOUT_MS);

  if (capture.kind === 'auto') {
    return {
      lat: capture.lat,
      lng: capture.lng,
      accuracyMeters: capture.accuracyMeters,
      locationSource: 'gps_auto',
    };
  }

  if (capture.kind === 'timeout_os_cache') {
    return {
      lat: capture.lat,
      lng: capture.lng,
      accuracyMeters: capture.accuracyMeters,
      locationSource: 'gps_low_accuracy_fallback',
    };
  }

  // capture.kind === 'need_fallback_chain'
  const coord = resolveFallbackChain(args.fallbackSources);
  return { ...coord, accuracyMeters: null, locationSource: 'manual_no_signal' };
}

// 좌표를 교체하고 locationSource를 항상 'gps_dragged'로 바꾼다(원 소스 무관, 드래그
// 즉시 전이). accuracyMeters는 null로 초기화한다 — 사용자가 손으로 옮긴 위치라 GPS
// 정확도 수치가 더 이상 의미를 갖지 않기 때문이다.
export function applyDraggedSource(
  current: ResolvedLocation,
  next: { lat: number; lng: number }
): ResolvedLocation {
  return {
    lat: next.lat,
    lng: next.lng,
    accuracyMeters: null,
    locationSource: 'gps_dragged',
  };
}
