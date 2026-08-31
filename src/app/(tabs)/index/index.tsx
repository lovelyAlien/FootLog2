// src/app/(tabs)/index.tsx
// Phase 3(체크인 코어 루프, 03-09-PLAN.md)에서 최소 지도 화면(03-CONTEXT.md D-06)으로
// 시작했고, Phase 4가 이 화면을 `(tabs)` 그룹의 오늘 탭으로 승격했다(04-03-PLAN.md
// Task 2, D-06) — 지도 렌더링, GPS 캡처, 확인 핀 드래그 로직은 이 이동으로 바뀌지
// 않고 그대로 재사용된다.
//
// 배너 스택(NotificationDeniedBanner 위, LocationDeniedBanner 아래)의 위치(지도
// 상단, 세이프에어리어 아래)는 04-UI-SPEC.md가 확정한 최종 위치다 — 탭바 위로
// 이관하지 않고 그대로 유지한다.
//
// 지도 스타일 토큰 결정(03-09-PLAN.md 지도 스타일 토큰 결정 항목): colors.mapLand,
// colors.mapRoad, colors.mapWater는 이 화면에서 쓰지 않는다. react-native-maps의
// customMapStyle prop은 구글 지도 provider 전용이고 이 phase는 API 키가 필요 없는
// 애플 지도 기본 provider를 쓴다(provider 미지정). accent(올리브)는 체크인 버튼 등
// UI 크롬에만 쓴다 — 지도 위 확인 핀/저장된 핀/궤적선은 2026-08-31부터
// colors.pin/pinSoft(테라코타, DESIGN.md 참고)를 쓴다. 이건 accent의 "1개, 절대 안
// 늘림" 원칙을 깨는 게 아니라 지도 마커 전용 별도 범주(구글맵/애플맵 관례 차용)다.
//
// 03-09: 체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 → 드래프트 upsert.
// 03-10 Task 1: "확인"/"다시 시도" → commitCheckin 배선 + 미저장 이탈 안내.
// 사진/메모 배선(03-10 Task 2)과 드래프트 복구(03-10 Task 3)는 아래 각 절 참고.
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Redirect } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { MarkerDragStartEndEvent, Region } from 'react-native-maps';
// reanimated default export는 반드시 `Reanimated`로 바인딩한다 — `Animated`로 쓰면
// 위 react-native의 `Animated`(크로스페이드용, Plan 03-12 회귀 가드 대상)를 가려
// checkin-wiring Test 46이 깨지고 native driver 크로스페이드가 무너진다
// (04-06-PLAN.md Task 2). react-native-gesture-handler는 이 화면에서 직접 import하지
// 않는다 — 시트 제스처는 @gorhom/bottom-sheet 내부가 처리한다(checkin-wiring gesture-handler 미사용 회귀 가드).
import Reanimated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, radius, spacing, typography } from '../../../theme/tokens';
import { fetchNotificationPermission, shouldShowPriming } from '../../../notifications/permissions';
import type { PermissionSnapshot } from '../../../notifications/permissions';
import { NotificationDeniedBanner } from '../../../components/NotificationDeniedBanner';
import { LocationDeniedBanner } from '../../../components/LocationDeniedBanner';
import { CheckinActionCard } from '../../../components/CheckinActionCard';
import { TodayBottomSheet } from '../../../today/TodayBottomSheet';
import {
  checkinReducer,
  initialCheckinState,
  canEditNoteAndPhoto,
  CHECKIN_COPY,
} from '../../../checkin/checkinFlow';
import { fetchLocationPermission, requestLocationPermission } from '../../../checkin/permissions';
import { resolveCheckinLocation } from '../../../checkin/location';
import type { FallbackSources, ResolvedLocation } from '../../../checkin/location';
import { loadRecoverableDraft, upsertDraft, updateDraftCoordinate } from '../../../checkin/draftRepo';
import {
  commitCheckin,
  getLatestCheckinCoordinate,
  getTodayCheckins,
  updateCheckinNoteAndPhoto,
} from '../../../checkin/checkinRepo';
import type { NewCheckinParams } from '../../../checkin/checkinRepo';
import { defaultCryptoDeps, defaultLocationDeps } from '../../../checkin/deps';
import {
  CAPTURE_TIMEOUT_MS,
  LAST_KNOWN_MAX_AGE_MS,
  LOCATION_ACCURACY_BALANCED,
  MAP_REGION_DELTA,
} from '../../../checkin/config';
import {
  PHOTO_ACTION_SHEET_CANCEL_INDEX,
  PHOTO_ACTION_SHEET_OPTIONS,
  PHOTO_SOURCE_BY_ACTION_SHEET_INDEX,
  pickAndCopyPhoto,
} from '../../../checkin/photos';
import { resolveLocalDateKey, resolveTimeZone, toIsoTimestamp } from '../../../checkin/localDate';
import type { CheckinRow, LocationSource } from '../../../db/schema';
import type { CheckinState } from '../../../checkin/checkinFlow';
import { SymbolView } from 'expo-symbols';
import { buildTrajectoryCoordinates } from '../../../today/trajectory';

// MAP_REGION_DELTA(확인 핀으로 카메라를 이동시킬 때 쓰는 줌 레벨 근사치)는
// 05-03-PLAN.md Task 2부터 src/checkin/config.ts로 옮겨졌다 — CheckinDetailScreen.tsx의
// 잠긴 정적 지도 미리보기도 같은 값이 필요해져 두 곳에 값을 중복 선언하지 않기
// 위해서다(이 저장소 규약). 위 checkin/config import에서 함께 가져온다.

// 나침반 모드 진입 시 지도를 기울이는 각도 — 구글맵 "나침반(3D 시선 회전)" 모드의
// 살짝 눕는 느낌을 재현한다. 45도는 애플/구글 지도 모두에서 흔히 쓰는 관용적인 값.
const COMPASS_PITCH_DEGREES = 45;

// 재센터 버튼의 animateToRegion(위치+줌) 애니메이션 길이. handleRecenterPress가
// 이 시간만큼 기다린 뒤에야 후속 animateCamera(heading/pitch)를 보낸다 — 동시에
// 부르면 iOS MKMapView가 진행 중이던 위치 애니메이션을 취소하고 각도만 반영하는
// 네이티브 경합이 있어(아래 handleRecenterPress 주석 참고) 순차 실행이 필수다.
// 2026-08-31 — 예전엔 react-native-maps 기본값(500ms)에 맞췄으나, 이 앱의 다른
// 모션 토큰(motion.bottomSheetSnapMs 220ms, motion.confirmPinDropMs 160ms)보다
// 훨씬 길어 방향 전환이 유난히 느리게 느껴진다는 지적에 250ms로 단축 — 구조(순차
// 실행)는 그대로 두고 숫자만 줄인다.
const RECENTER_ANIMATION_MS = 250;

// 회귀 가드 — "지도를 많이 줌아웃한 상태에서 재센터를 누르면 목표 줌까지 한 번에
// 안 가고 여러 번 눌러야 하는" 문제(2026-08-31 창업자 리포트, 실기기에서 재현 확인).
// 원인은 iOS MKMapView의 animateToRegion이 위도 델타가 극단적으로 큰 폭(대륙/국가
// 스케일)만큼 줄어드는 애니메이션을 요청받으면 한 호출로 목표까지 수렴하지 않고
// 매 호출마다 그 격차의 일부만 좁힌다는 네이티브 특성이다(요청한 duration과 무관 —
// 더 긴 duration을 줘도 같은 현상). 현재 화면 위도 델타가 목표(MAP_REGION_DELTA)의
// 이 배수보다 크면 "극단적 줌아웃"으로 보고, 애니메이션 대신 즉시 이동(duration 0)
// 시켜 여러 번 누를 필요 자체를 없앤다. 평소(약간 팬/줌된 정도)의 재센터는 여전히
// 부드럽게 애니메이션된다.
const EXTREME_ZOOM_OUT_RATIO = 10;

// 확인 핀 히트 영역 확장값 — 24px 원을 최소 터치 타겟 크기까지 넓힌다.
const PIN_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

// 이동 궤적선 두께 — 2px, 실선. 색상은 2026-08-31부터 colors.pinSoft(테라코타, DESIGN.md 참고).
const TRAJECTORY_STROKE_WIDTH = 2;

// 재센터 버튼과 앱 최초 진입(내 위치 기준 확대 시작) 둘 다가 공유하는 위치 조회
// 순서 — 구글맵처럼 즉시 반응하도록 신선한 OS 캐시를 먼저 쓰고, 없을 때만 새
// GPS fix를 기다리되 무한정 기다리지 않는다(captureWithTimeout과 동일한
// GPS-vs-타이머 레이스). 그마저 실패하면 나이 제한 없는 OS 캐시라도 마지막
// 수단으로 쓴다. 위치 권한 요청은 이 함수의 책임이 아니다 — 호출자가 이미
// 허용된 상태에서만 불러야 한다(undetermined 상태에서 프롬프트를 띄우는 책임은
// requestLocationPermission 호출부만 진다, 03-05 확정 경계).
//
// onRefine — OS 캐시는 신선도(LAST_KNOWN_MAX_AGE_MS)만 검사할 뿐 정확도는
// 검사하지 않는다. 앱을 막 켰거나 GPS가 막 신호를 다시 잡기 시작한 시점이면
// 캐시에는 아직 부정확한 초기 추정치(Wi-Fi/기지국 기반)만 있을 수 있는데,
// iOS가 백그라운드에서 이 캐시를 계속 정제하기 때문에 버튼을 여러 번 눌러야
// 점점 실제 위치에 수렴하는 것처럼 보였다(회귀 아님 — 매번 그 시점의 OS
// 추정치를 그대로 읽은 것뿐). 캐시를 썼을 때만, 화면에 캐시 값을 즉시 보여준
// 뒤 백그라운드에서 실제 GPS를 한 번 더 떠서 onRefine으로 결과를 넘긴다 —
// 한 번만 눌러도 잠시 후 정확한 위치로 자동 보정되게 한다(구글맵과 동일).
// 이미 fresh GPS를 쓴 경로(캐시 없음)는 더 정확도가 나아질 대상이 없으므로
// onRefine을 부르지 않는다.
async function resolveInstantPosition(
  onRefine?: (coords: { latitude: number; longitude: number }) => void
): Promise<{ latitude: number; longitude: number } | null> {
  const freshCache = await defaultLocationDeps
    .getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS })
    .catch(() => null);
  if (freshCache) {
    if (onRefine) {
      defaultLocationDeps
        .getCurrentPositionAsync({ accuracy: LOCATION_ACCURACY_BALANCED })
        .then((position) => onRefine(position.coords))
        .catch(() => {});
    }
    return freshCache.coords;
  }

  const positionPromise = defaultLocationDeps.getCurrentPositionAsync({
    accuracy: LOCATION_ACCURACY_BALANCED,
  });
  const gpsOutcome = positionPromise.then(
    (pos) => ({ tag: 'gps' as const, pos }),
    () => ({ tag: 'gps_error' as const })
  );
  let timer: ReturnType<typeof setTimeout>;
  const timerOutcome = new Promise<{ tag: 'timeout' }>((resolve) => {
    timer = setTimeout(() => resolve({ tag: 'timeout' }), CAPTURE_TIMEOUT_MS);
  });
  const outcome = await Promise.race([gpsOutcome, timerOutcome]);
  clearTimeout(timer!);

  if (outcome.tag === 'gps') return outcome.pos.coords;

  // 정확도 파라미터(requiredAccuracy) 검토: 여기도 의도적으로 쓰지 않는다 — 위
  // freshCache 분기와 달리 이 경로는 이미 GPS-vs-타임아웃 레이스에서 진 뒤의
  // 최종 폴백이라, requiredAccuracy로 걸러 null이 되면 재센터 버튼이 조용히 아무
  // 것도 하지 않게 된다("부정확해도 뭔가 보여주는 것"이 "아예 안 움직이는 것"보다
  // 낫다는 판단). CLAUDE.md의 OS 캐시 정확도 검토 규칙(2026-08-28) 대상 API지만
  // freshCache 분기처럼 백그라운드 재보정(onRefine)을 걸 대상 GPS 시도가 이미
  // 소진된 상태라 재보정 경로도 두지 않는다.
  const staleCache = await defaultLocationDeps.getLastKnownPositionAsync().catch(() => null);
  return staleCache ? staleCache.coords : null;
}

// 핀 시각 상태 — 03-UI-SPEC.md 확인 핀 시각 상태 절의 확정 매핑을 그대로 스타일로 옮긴다.
function pinStyleForSource(locationSource: LocationSource) {
  if (locationSource === 'gps_auto') {
    return styles.pinConfident;
  }
  if (locationSource === 'gps_dragged') {
    return styles.pinDragged;
  }
  // 'gps_low_accuracy_fallback' | 'manual_denied' | 'manual_no_signal'
  return styles.pinFallback;
}

export default function Index() {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [state, dispatch] = useReducer(checkinReducer, initialCheckinState);
  // 재센터링 버튼 연속 탭 토글(구글맵 스타일) — 아이콘 리렌더용 state. 토글 판정
  // 자체는 아래 orientationModeRef가 동기적으로 담당한다(handleRecenterPress의
  // useCallback deps를 []로 유지하기 위해 isSaveInFlightRef와 동일한 ref+state 짝 패턴 사용).
  const [orientationMode, setOrientationMode] = useState<'north' | 'compass'>('north');
  // 오늘 저장된 체크인 — 지도 핀·궤적선·(04-06의) 바텀시트 리스트가 공유하는 유일한
  // 오늘 데이터(04-CONTEXT.md D-11). 별도의 두 번째 조회를 만들지 않는다.
  const [todayCheckins, setTodayCheckins] = useState<CheckinRow[]>([]);
  // 오늘 탭 콘텐츠 영역(탭바 제외) 높이 — 루트 View의 onLayout으로 측정한다. 시트
  // 스냅 지점(TodayBottomSheet)과 플로팅 버튼 오프셋 계산(floatingButtonStyle)이
  // 공유하는 공통 좌표계 기준이다(04-06-PLAN.md Task 2, D-05).
  const [containerHeight, setContainerHeight] = useState(0);

  const mapRef = useRef<MapView>(null);
  const lastMapCoordinateRef = useRef<{ lat: number; lng: number } | null>(null);
  // 현재 화면 위도 델타(줌 폭) — EXTREME_ZOOM_OUT_RATIO 판정에 쓴다. null이면 아직
  // onRegionChangeComplete가 한 번도 안 왔다는 뜻이며, resolveRecenterAnimationMs는
  // 이 경우도 "즉시 이동"으로 처리한다(이미 목표 근처라는 근거가 없으므로).
  const lastLatitudeDeltaRef = useRef<number | null>(null);
  const orientationModeRef = useRef<'north' | 'compass'>('north');
  // 구글맵 실제 동작 재현 — 첫 탭은 "북쪽 고정으로 확대·이동"만 하고 나침반 모드로
  // 바로 들어가지 않는다. 이 ref가 false인 동안은 orientationModeRef가 이미 어떤
  // 값이든 무조건 'north'로 진입시키고, 두 번째 탭부터 north/compass를 토글한다.
  const hasCenteredOnceRef = useRef(false);
  // resolveInstantPosition의 onRefine(백그라운드 GPS 보정)이 이미 지나가버린 재센터
  // 탭의 결과로 뒤늦게 지도를 옮기지 않도록 하는 세대 번호. 새 재센터 탭이나 수동
  // 팬이 일어날 때마다 증가시켜, 그 이전 보정 콜백이 도착해도 무시하게 만든다.
  const recenterRequestIdRef = useRef(0);
  const headingSubscriptionRef = useRef<Awaited<
    ReturnType<typeof defaultLocationDeps.watchHeadingAsync>
  > | null>(null);
  const isMountedRef = useRef(true);
  const buttonContentOpacity = useState(() => new Animated.Value(1))[0];

  // 첫 TAP_CONFIRM 시점에 만든 체크인 id — "다시 시도"가 같은 id를 재사용해 중복 row를
  // 만들지 않도록 리듀서 상태가 아니라 ref에 보관한다(T-3-25). commitCheckin이
  // ok:true를 반환한 뒤 다음 체크인 사이클을 위해 초기화한다.
  const pendingCheckinIdRef = useRef<string | null>(null);
  // 미저장 이탈 안내(Alert)를 정확히 1회만 노출하기 위한 플래그.
  const unsavedExitAlertShownRef = useRef(false);
  // WR-04 리뷰 대응 — handleSaveCheckin의 state.phase 가드는 마지막 렌더에서 캡처된
  // 클로저 값을 읽으므로, 리렌더가 끼어들기 전에 도착한 두 번째 탭 이벤트는 같은
  // "CONFIRM"(혹은 "SAVE_FAILED")을 보고 가드를 통과할 수 있다. dispatch와 무관하게
  // 동기적으로 즉시 갱신되는 이 ref로 실제 중복 실행을 막는다(CheckinActionCard.tsx는
  // "비활성화가 아니라 미마운트" 계약 때문에 disabled prop을 둘 수 없다 —
  // checkinCardUi.test.ts Test 11 참고).
  const isSaveInFlightRef = useRef(false);
  // 리뷰 발견 — handleCheckinPress는 handleSaveCheckin과 달리 재진입 가드가 state.phase
  // 클로저 체크뿐이었다. 리렌더가 끼어들기 전에 도착한 두 번째 탭은 같은 IDLE을 보고
  // 가드를 통과해 GPS 캡처/드래프트 저장/카메라 애니메이션이 중복 실행될 수 있었다 —
  // isSaveInFlightRef와 동일한 패턴으로 동기적 ref 가드를 추가한다.
  const isCheckinInFlightRef = useRef(false);
  // 리뷰 발견 — 확인 핀은 CAPTURE_RESOLVED가 dispatch되는 즉시(동기) draggable해지지만,
  // 그 좌표를 drafts 테이블에 쓰는 upsertDraft는 아직 진행 중일 수 있다. 그 사이 사용자가
  // 핀을 드래그하면 handleDragEnd의 UPDATE가 아직 존재하지 않는 row를 대상으로 조용히
  // 0행 적용돼 드래그 보정이 유실됐다(크래시 시 드래그 이전 좌표로 복구). 이 ref로
  // drafts에 대한 모든 쓰기를 upsertDraft → 이후 드래그 갱신 순서로 직렬화한다.
  const draftWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  // AppState 리스너(구독은 한 번만 생성)가 항상 최신 state를 읽을 수 있도록 미러링하는
  // ref — 매 렌더마다 구독을 다시 만들지 않기 위한 용도(리스너 자체는 [flushNoteAndPhoto]
  // 에만 의존).
  const stateRef = useRef<CheckinState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 나침반 모드로 전환된 채 화면을 벗어나면 구독이 계속 살아 배터리를 소모하므로
  // 언마운트 시 반드시 정리한다(모드 전환 시 정리는 handleRecenterPress가 담당).
  useEffect(() => {
    return () => {
      headingSubscriptionRef.current?.remove();
    };
  }, []);

  // priming 리다이렉트 게이트 — isMounted 가드 형태를 그대로 따른다.
  useEffect(() => {
    let isMounted = true;
    fetchNotificationPermission()
      .then((snapshot) => {
        if (isMounted) {
          setPermission(snapshot);
        }
      })
      .catch((error) => {
        if (isMounted) {
          console.error('Failed to fetch notification permission', error);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 앱 부팅 시 드래프트 복구(03-10-PLAN.md Task 3, T24 엣지케이스 1번과 4번). 결과가 null이면
  // 드래프트가 아예 없거나, 날짜가 바뀌어 loadRecoverableDraft가 이미 조용히 삭제한
  // 경우다 — 두 경우 모두 화면에 어떤 안내도 표시하지 않는다(복구 프롬프트 없음).
  // 결과가 있으면 곧장 CONFIRM 상태로 진입시킨다 — 확인 핀 화면 재진입 자체가 복구
  // 제안이며, 계속 진행할지 묻는 별도의 확인 다이얼로그 문구를 두지 않는다
  // (03-UI-SPEC.md §Copywriting Contract: 저장 전이라 파괴적 액션이 아님).
  //
  // 복구 시 위치 권한을 재확인하거나 GPS를 다시 잡지 않는다 — 드래프트는 이미 확정된
  // lat/lng를 갖고 있다(T24 edge case 4, 권한 변경 강건성). 그래서 이 useEffect
  // 블록 안에서는 requestLocationPermission/resolveCheckinLocation을 호출하지 않는다.
  //
  // D-05 커버리지: "확인" 탭 이후 저장 재시도 중 앱이 강제종료돼도 commitCheckin이
  // 성공하기 전까지 드래프트 row가 살아있으므로, 이 복구 경로가 그 케이스까지 자동으로
  // 처리한다 — 별도의 "저장 실패" 상태 플래그를 만들지 않는다.
  //
  // 드래프트가 없는 정상적인 앱 진입에서는(네이버지도/구글맵과 동일하게) 내
  // 위치 기준으로 확대된 상태로 시작한다. 위치 권한을 새로 요청하지는 않는다 —
  // 이미 허용된 상태일 때만 적용하고, 아직 한 번도 물어보지 않은 상태라면
  // 전국 축소 뷰를 그대로 둔다("체크인" 첫 탭이 권한 요청을 소유한다는 위
  // 경계를 그대로 지킨다). 재센터 버튼과 동일한 resolveInstantPosition
  // (캐시 우선 → GPS-vs-타임아웃 레이스 → 오래된 캐시)을 재사용한다.
  useEffect(() => {
    let isMounted = true;
    loadRecoverableDraft(db, resolveLocalDateKey(new Date()))
      .then(async (draft) => {
        if (!isMounted) return;

        if (draft !== null) {
          const location = {
            lat: draft.lat,
            lng: draft.lng,
            accuracyMeters: draft.accuracy_meters,
            locationSource: draft.location_source,
          };
          dispatch({ type: 'RESTORE_DRAFT', location });
          await waitForMapReady();
          if (!isMounted) return;
          mapRef.current?.animateToRegion({
            latitude: draft.lat,
            longitude: draft.lng,
            latitudeDelta: MAP_REGION_DELTA,
            longitudeDelta: MAP_REGION_DELTA,
          });
          return;
        }

        const permission = await fetchLocationPermission();
        if (!isMounted || !permission.granted) return;
        const initialRequestId = recenterRequestIdRef.current;
        const coords = await resolveInstantPosition((refinedCoords) => {
          if (!isMounted || recenterRequestIdRef.current !== initialRequestId) return;
          // 리뷰 발견 — onRefine은 waitForMapReady 게이트를 거치지 않고 곧장
          // animateToRegion을 불렀다. 백그라운드 GPS 보정이 onMapReady보다 먼저
          // 끝나면(콜드 부팅 중 흔한 순서, 시뮬레이터에서는 거의 항상 그렇다) 이
          // 호출이 조용히 무시된다 — 다른 모든 카메라 호출 지점과 동일하게 게이트를
          // 통과시킨다.
          (async () => {
            await waitForMapReady();
            if (!isMounted || recenterRequestIdRef.current !== initialRequestId) return;
            mapRef.current?.animateToRegion(
              {
                latitude: refinedCoords.latitude,
                longitude: refinedCoords.longitude,
                latitudeDelta: MAP_REGION_DELTA,
                longitudeDelta: MAP_REGION_DELTA,
              },
              RECENTER_ANIMATION_MS
            );
          })().catch((error) => {
            console.error('Failed to apply refined initial position', error);
          });
        });
        // 리뷰 발견 — 이 최종 animateToRegion에는 staleness 가드가 없어서, 콜드
        // 부팅 시 resolveInstantPosition이 최대 5초까지 걸리는 동안 사용자가 이미
        // 수동으로 재센터/팬을 하거나 체크인을 확정해도 뒤늦게 이 호출이 카메라를
        // 되돌려버렸다 — onRefine과 동일한 recenterRequestIdRef 가드를 추가한다.
        if (!isMounted || !coords || recenterRequestIdRef.current !== initialRequestId) return;
        await waitForMapReady();
        if (!isMounted || recenterRequestIdRef.current !== initialRequestId) return;
        mapRef.current?.animateToRegion({
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: MAP_REGION_DELTA,
          longitudeDelta: MAP_REGION_DELTA,
        });
      })
      .catch(console.error);
    return () => {
      isMounted = false;
    };
  }, [db]);

  // 오늘 체크인 목록 로더(04-05-PLAN.md) — 지도 핀·궤적선·(04-06) 바텀시트 리스트가
  // 공유하는 단일 조회. 날짜 키를 화면 상태에 캐시하지 않고 호출 시점마다 새로
  // 계산한다 — 자정을 넘겨 앱을 계속 켜둔 경우에도 다음 로드가 새 날짜를 보게
  // 하기 위함이다. 실패해도 기존 체크인 플로우는 그대로 동작해야 하므로 throw하지
  // 않고 콘솔 로그만 남긴다(프로미스 미삼킴 규약).
  const reloadTodayCheckins = useCallback(() => {
    getTodayCheckins(db, resolveLocalDateKey(new Date()))
      .then((rows) => {
        if (isMountedRef.current) {
          setTodayCheckins(rows);
        }
      })
      .catch((error) => {
        console.error("Failed to load today's check-ins", error);
      });
  }, [db]);

  // 마운트 시 1회 로드 — 드래프트 복구 effect(위)와 별도로 둔다. 그 effect의 본문을
  // 건드리면 checkin-wiring 테스트(드래프트 복구 정규식 앵커 의존 케이스들)가 깨진다.
  useEffect(() => {
    reloadTodayCheckins();
  }, [reloadTodayCheckins]);

  // 궤적선 좌표 — getTodayCheckins가 이미 timestamp_utc 오름차순으로 정렬해 반환하므로
  // 여기서 다시 정렬하지 않는다(D-11 단일 쿼리 계약).
  const trajectoryCoordinates = useMemo(
    () => buildTrajectoryCoordinates(todayCheckins),
    [todayCheckins]
  );

  const isCapturing = state.phase === 'CAPTURING';
  const showActionCard = state.phase !== 'IDLE' && !isCapturing;

  // 시트 상단 y좌표(컨테이너 좌표계) — TodayBottomSheet가 계속 써 넣고, 아래
  // floatingButtonStyle이 읽는다(D-05, 부모 소유 SharedValue 계약).
  const sheetPosition = useSharedValue(0);

  // 루트 View 레이아웃 측정 — 같은 값이 다시 들어오면 리렌더를 건너뛴다.
  const handleContainerLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = event.nativeEvent.layout.height;
      setContainerHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    },
    []
  );

  // 플로팅 체크인/재센터 버튼의 화면 하단 오프셋 — 시트 상단(animatedPosition)을
  // 실시간(워크릿)으로 추적한다. onChange(index) 같은 이산 콜백에 의존하지 않는
  // 이유: DRAGGING 상태에서 손가락 위치를 그대로 따라가야 한다(04-UI-SPEC.md).
  // containerHeight가 아직 0(레이아웃 측정 전)이면 sheetPosition도 0이라 음수
  // bottom이 나올 수 있으므로, 그 동안은 Phase 3 정적 오프셋으로 폴백한다.
  const floatingButtonStyle = useAnimatedStyle(() => {
    if (containerHeight <= 0) {
      return { bottom: insets.bottom + spacing.xl };
    }
    return { bottom: containerHeight - sheetPosition.value + spacing.lg };
  }, [containerHeight, insets.bottom]);

  // 체크인 버튼과 로딩 인디케이터 사이 전환에 크로스페이드를 적용한다
  // (motion.saveStateCrossfadeMs, 03-UI-SPEC.md 체크인 알약버튼 절).
  //
  // Plan 03-12 — 근본 원인: 이 effect가 원래 [isCapturing, buttonContentOpacity]에만
  // 의존해서, isCapturing이 내내 false인 SAVED→IDLE(지도 탭 DISMISS) 전환에서는
  // 재실행되지 않았다. 그 사이 알약버튼의 Animated.View는 CONFIRM~SAVED 구간
  // 내내 언마운트돼 있다가 재마운트되는데, RN의 알려진 native-driver 리마운트
  // 한계(facebook/react-native #28114, #38510, #23712, #23621) 때문에 마지막
  // setValue(0)(크로스페이드 시작값)을 그대로 물려받아 라벨이 투명하게 렌더됐다.
  // 채택한 수정: 의존성에 showActionCard를 추가(버튼 마운트 여부와 직결)하고,
  // cleanup에서 stop() + setValue(1)로 항상 1에 park해 이중으로 방어한다.
  // Animated.View를 조건부 언마운트 대신 항상 마운트해두고 visibility만 토글하는
  // 대안은 채택하지 않았다 — 03-UI-SPEC.md line 150이 버튼↔액션카드 교체를 "단순
  // 조건부 렌더링"으로 이미 확정했고, 항상 마운트해두면 액션 카드 아래 히트 영역이
  // 남아 오탭 위험이 생기며, cleanup park만으로 리마운트 함정이 이미 무력화되므로
  // 추가 복잡도를 들일 이유가 없다.
  useEffect(() => {
    if (showActionCard) return;
    buttonContentOpacity.setValue(0);
    const crossfade = Animated.timing(buttonContentOpacity, {
      toValue: 1,
      duration: motion.saveStateCrossfadeMs,
      useNativeDriver: true,
    });
    crossfade.start();
    return () => {
      crossfade.stop();
      buttonContentOpacity.setValue(1);
    };
  }, [showActionCard, isCapturing, buttonContentOpacity]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    lastMapCoordinateRef.current = { lat: region.latitude, lng: region.longitude };
    lastLatitudeDeltaRef.current = region.latitudeDelta;
  }, []);

  // EXTREME_ZOOM_OUT_RATIO 참고 — 현재 화면이 목표 줌보다 훨씬 넓게 잡혀 있으면
  // animateToRegion이 한 번에 수렴하지 못하므로 즉시 이동(duration 0)시킨다.
  //
  // 리뷰 발견 — currentDelta가 null(onRegionChangeComplete가 아직 한 번도 안 옴)일 때
  // "평소 애니메이션"으로 처리했더니, 콜드 부팅 직후 첫 재센터 탭이 바로 이 조건에
  // 걸려 정작 고치려던 "여러 번 눌러야 수렴" 버그를 그대로 재현했다(실기기 재현 확인
  // — 세션 중 지도를 한 번도 손으로 팬/줌하지 않은 채 첫 탭을 누른 경우). null은
  // "이미 목표 근처"라는 근거가 전혀 없는 상태이므로, 반대로 안전한 기본값은
  // "즉시 이동"이다 — 최악의 경우도 이미 목표에 가까운데 애니메이션 없이 스냅되는
  // 정도의 사소한 모션 손실일 뿐, 기능적 버그(여러 번 눌러야 함)는 아니다.
  const resolveRecenterAnimationMs = useCallback(() => {
    const currentDelta = lastLatitudeDeltaRef.current;
    if (currentDelta == null || currentDelta > MAP_REGION_DELTA * EXTREME_ZOOM_OUT_RATIO) {
      return 0;
    }
    return RECENTER_ANIMATION_MS;
  }, []);

  // 콜드 부팅 직후 첫 상호작용 버그 가드 — 네이티브 MapView(iOS MKMapView)가
  // 완전히 초기화되기 전에 animateToRegion 등 imperative 메서드를 호출하면
  // 에러 없이 조용히 무시된다. 앱을 막 켜고 서두르며 재센터/체크인 버튼을 누르면
  // 이 창(window)에 걸려 카메라가 전혀 움직이지 않는다(실기기·시뮬레이터 콜드
  // 부팅으로 재현 확인됨 — Fast Refresh로 리셋한 상태는 네이티브 뷰가 이미
  // 준비돼 있어 이 버그를 가리므로 재현되지 않았다). onMapReady가 최초 1회
  // fire되기 전까지는 카메라를 움직이는 모든 imperative 호출을 여기서 대기시킨다.
  const isMapReadyRef = useRef(false);
  const mapReadyWaitersRef = useRef<Array<() => void>>([]);

  const handleMapReady = useCallback(() => {
    isMapReadyRef.current = true;
    const waiters = mapReadyWaitersRef.current;
    mapReadyWaitersRef.current = [];
    waiters.forEach((resolve) => resolve());
  }, []);

  const waitForMapReady = useCallback(() => {
    if (isMapReadyRef.current) return Promise.resolve();
    return new Promise<void>((resolve) => {
      mapReadyWaitersRef.current.push(resolve);
    });
  }, []);

  // 사용자가 지도를 손가락으로 직접 움직이면 재센터 버튼의 "팔로우" 상태를 즉시
  // 해제한다(구글맵과 동일 동작). 이게 없으면 예: 재센터 탭(north) → 지도를 다른
  // 곳으로 수동 드래그 → 재센터 버튼을 다시 탭했을 때, 앱이 "사용자가 방금 시선을
  // 옮겼다"는 사실을 모른 채 이전 토글 상태만 보고 곧장 나침반 모드로 건너뛰어
  // 버렸다(hasCenteredOnceRef가 세션 내내 리셋되지 않는 문제). 다음 탭이 다시
  // "북쪽 고정 재센터"부터 시작하도록 hasCenteredOnceRef를 리셋하고, 나침반
  // 구독이 살아있었다면 정리한 뒤 지도 방향도 북쪽으로 되돌린다.
  const handlePanDrag = useCallback(() => {
    // 재센터 탭이 걸어둔 백그라운드 GPS 보정(resolveInstantPosition의 onRefine)이
    // 아직 안 끝난 상태에서 사용자가 지도를 다시 손으로 옮기면, 그 보정 결과가
    // 뒤늦게 도착해 방금 사용자가 옮긴 화면을 다시 잡아채면 안 된다.
    recenterRequestIdRef.current += 1;

    if (!hasCenteredOnceRef.current) return;

    hasCenteredOnceRef.current = false;
    headingSubscriptionRef.current?.remove();
    headingSubscriptionRef.current = null;

    if (orientationModeRef.current !== 'north') {
      orientationModeRef.current = 'north';
      setOrientationMode('north');
      mapRef.current?.animateCamera({ heading: 0, pitch: 0 });
    }
  }, []);

  // 구글맵 스타일 "내 위치로 이동" 버튼 — 체크인 흐름과 무관하게 지도를 사용자의
  // 현재 위치로 재센터링한다. 권한이 아직 없으면 요청하고(undetermined일 때만
  // 실제 프롬프트가 뜸 — requestLocationPermission의 기존 가드 재사용),
  // 거부 상태면 조용히 아무 것도 하지 않는다(별도 배너는 LocationDeniedBanner가
  // 이미 담당).
  //
  // 연속 탭 시 나침반 모드 ↔ 북쪽 고정 모드를 전환한다(구글맵 "내 위치" 버튼과 동일
  // 동작). orientationModeRef가 동기적으로 최신 모드를 들고 있어 이 콜백의 deps를
  // []로 유지할 수 있다 — orientationMode state는 아이콘 리렌더 전용이다.
  //
  // 즉시 반응 + 항상 내 위치 기준으로 재확대 — resolveInstantPosition(캐시 우선,
  // 없으면 GPS-vs-타임아웃 레이스, 그마저 없으면 오래된 캐시)으로 좌표를 구한 뒤
  // animateToRegion에 latitudeDelta/longitudeDelta를 매번 MAP_REGION_DELTA로
  // 고정 전달한다 — 사용자가 지도를 아무리 멀리 팬하거나 줌아웃해놨어도, 이
  // 버튼은 항상 "내 위치 기준으로 확대된" 고정 줌 레벨로 되돌아간다(구글맵과
  // 동일 동작). 위치를 못 구하면(이 기기에서 한 번도 위치를 잡아본 적 없는
  // 극단적인 경우만) 조용히 아무 것도 하지 않는다.
  //
  // 회귀 가드 — "여러 번 눌러야 실제 위치로 맞춰지던" 문제: OS 캐시는 정확도를
  // 검사하지 않아 초기 부정확한 값을 즉시 반응용으로 보여줄 수 있다. onRefine
  // 콜백으로 백그라운드 GPS 보정 결과를 받아, 이 탭이 여전히 최신 탭일 때만
  // (recenterRequestIdRef로 판정 — 그 사이 재탭하거나 손으로 지도를 옮겼으면
  // 무시) 조용히 재보정한다. 한 번만 눌러도 잠시 후 정확한 위치로 수렴한다.
  const handleRecenterPress = useCallback(() => {
    (async () => {
      const requestId = ++recenterRequestIdRef.current;
      try {
        const nextPermission = await requestLocationPermission();
        if (!nextPermission.granted) return;

        const coords = await resolveInstantPosition((refinedCoords) => {
          if (!isMountedRef.current || recenterRequestIdRef.current !== requestId) return;
          // 리뷰 발견 — onRefine은 waitForMapReady 게이트를 거치지 않고 곧장
          // animateToRegion을 불렀다(다른 모든 카메라 호출 지점과 다르게).
          (async () => {
            await waitForMapReady();
            if (!isMountedRef.current || recenterRequestIdRef.current !== requestId) return;
            mapRef.current?.animateToRegion(
              {
                latitude: refinedCoords.latitude,
                longitude: refinedCoords.longitude,
                latitudeDelta: MAP_REGION_DELTA,
                longitudeDelta: MAP_REGION_DELTA,
              },
              resolveRecenterAnimationMs()
            );
          })().catch((error) => {
            console.error('Failed to apply refined recenter position', error);
          });
        });
        if (!coords) return;
        // 리뷰 발견 — 아래 tail(주석 참고)이 그동안 recenterRequestIdRef를 재확인하지
        // 않아, 재센터 진행 중 사용자가 지도를 손으로 옮기면(handlePanDrag가 id를
        // 증가시키고 방향을 북쪽으로 리셋해도) 뒤늦게 도착한 이 태스크가 orientation/
        // heading 구독 상태를 그대로 덮어써 방금 사용자가 한 리셋을 되돌려버렸다.
        // await 지점(waitForMapReady, 아래 setTimeout, watchHeadingAsync)마다 재확인한다.
        if (!isMountedRef.current || recenterRequestIdRef.current !== requestId) return;

        await waitForMapReady();
        const recenterAnimationMs = resolveRecenterAnimationMs();
        if (!isMountedRef.current || recenterRequestIdRef.current !== requestId) return;
        mapRef.current?.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: MAP_REGION_DELTA,
            longitudeDelta: MAP_REGION_DELTA,
          },
          recenterAnimationMs
        );
        // 위치 이동 애니메이션이 끝나기 전에 아래에서 곧바로 animateCamera(heading/pitch)를
        // 호출하면, iOS MKMapView가 진행 중이던 region 애니메이션을 그 순간의 중간값에서
        // 취소하고 새 애니메이션으로 갈아타 버려 재센터가 목표 좌표에 도달하지 못한 채
        // 각도만 바뀐 것처럼 보이는 문제가 있었다(region 기반 애니메이션과 camera 기반
        // 애니메이션이 같은 네이티브 카메라 상태를 동시에 건드리며 경합). animateToRegion에
        // 준 duration만큼 기다린 뒤에야 다음 카메라 명령을 보낸다.
        //
        // 리뷰 발견(altitude) — 이 지연은 react-native-maps의 기본 애니메이션 길이를
        // 그대로 가정한 타이밍 추측이다(resolveRecenterAnimationMs가 반환한 값을 그대로
        // 씀 — 극단적 줌아웃이면 0, 아니면 RECENTER_ANIMATION_MS). onRegionChangeComplete를
        // 실제 완료 신호로 쓰는 대안을 검토했으나, 이 콜백은 이 호출이 아닌 다른 region
        // 변화(동시 사용자 팬 등)에도 반응하므로 잘못된 시점에 조기 완료로 오인해 바로 이
        // 지점이 고치려던 애니메이션 경합을 재도입할 위험이 있다 — 이번 라운드에서는
        // 그 위험을 감수하지 않고 고정 지연을 유지한다. Reduce Motion/저전력 모드로
        // 실제 네이티브 애니메이션 길이가 달라지면 이 가정이 깨질 수 있음을 남겨둔다.
        await new Promise((resolve) => setTimeout(resolve, recenterAnimationMs));
        if (!isMountedRef.current || recenterRequestIdRef.current !== requestId) return;

        const nextMode: 'north' | 'compass' = !hasCenteredOnceRef.current
          ? 'north'
          : orientationModeRef.current === 'north'
            ? 'compass'
            : 'north';

        // 이전 모드의 구독은 두 분기 모두에서 정리한다 — compass 재진입 시 중복
        // 구독을 남기지 않기 위함이다.
        headingSubscriptionRef.current?.remove();
        headingSubscriptionRef.current = null;

        if (nextMode === 'compass') {
          // 구글맵 나침반(3D 시선 회전) 모드 재현 — 진입 시 한 번 지도를 살짝
          // 기울인다(pitch). 이후 setCamera({ heading })는 지정한 필드만
          // 갱신하고 나머지 카메라 상태(pitch 포함)는 그대로 유지되므로, 매
          // heading 업데이트마다 pitch를 다시 넘길 필요는 없다.
          //
          // 리뷰 발견 — orientationMode/hasCenteredOnceRef를 watchHeadingAsync
          // 성공 여부와 무관하게 먼저 커밋했었다. 실패(예: 일시적 CoreLocation
          // 오류)해도 catch가 콘솔 로그만 남기고 넘어가, UI는 나침반 모드라고
          // 표시하면서 실제 헤딩 구독은 없는 상태로 남았다 — 구독 성공 확인 후에만
          // 상태를 커밋하도록 순서를 바꾼다.
          try {
            const subscription = await defaultLocationDeps.watchHeadingAsync((heading) => {
              const degrees = heading.trueHeading >= 0 ? heading.trueHeading : heading.magHeading;
              mapRef.current?.setCamera({ heading: degrees });
            });
            if (!isMountedRef.current || recenterRequestIdRef.current !== requestId) {
              subscription.remove();
              return;
            }
            headingSubscriptionRef.current = subscription;
            hasCenteredOnceRef.current = true;
            orientationModeRef.current = 'compass';
            setOrientationMode('compass');
            mapRef.current?.animateCamera({ pitch: COMPASS_PITCH_DEGREES });
          } catch (error) {
            console.error('Failed to start compass heading subscription', error);
            hasCenteredOnceRef.current = true;
            orientationModeRef.current = 'north';
            setOrientationMode('north');
            mapRef.current?.animateCamera({ heading: 0, pitch: 0 });
          }
        } else {
          hasCenteredOnceRef.current = true;
          orientationModeRef.current = nextMode;
          setOrientationMode(nextMode);
          mapRef.current?.animateCamera({ heading: 0, pitch: 0 });
        }
      } catch (error) {
        console.error('Failed to recenter map to current location', error);
      }
    })();
  }, []);

  // 체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 → 드래프트 upsert(D-03: 확인
  // 핀이 뜨는 즉시 영속화). Phase 3가 requestForegroundPermissionsAsync 호출을
  // 소유한다(03-05가 확정한 책임 경계) — requestLocationPermission 내부의
  // undetermined 가드가 반복 프롬프트를 막는다(T-3-15).
  const handleCheckinPress = useCallback(() => {
    // 리뷰 발견 — 이 ref 가드는 state.phase 클로저 체크보다 먼저, 리렌더 유무와
    // 무관하게 즉시 갱신되는 동기 체크로 더블탭 레이스를 막는다(WR-04의
    // isSaveInFlightRef와 동일 패턴).
    if (isCheckinInFlightRef.current) return;
    if (state.phase !== 'IDLE') return;
    isCheckinInFlightRef.current = true;
    dispatch({ type: 'TAP_CHECKIN' });

    (async () => {
      // WR-05 리뷰 대응 — 이 catch는 "아직 되돌릴 게 없는" 단계(권한 요청 ~
      // 드래프트 upsert)의 실패만 책임진다. CAPTURE_RESOLVED dispatch와
      // upsertDraft가 이미 성공했다면 SQLite에는 복구 가능한 드래프트가 남아있는
      // 상태이므로, 이 지점 이후 실패로 그 진행 상황 전체를 DISMISS로 지워버리면
      // 안 된다(T-3-24는 "캡처 중 예외"만 다루도록 스코프를 좁힌다).
      let location: ResolvedLocation;
      try {
        const nextPermission = await requestLocationPermission();
        const latestCheckinCoordinate = await getLatestCheckinCoordinate(db);
        const fallbackSources: FallbackSources = {
          latestCheckinCoordinate,
          lastMapCoordinate: lastMapCoordinateRef.current,
        };
        location = await resolveCheckinLocation({
          permission: nextPermission,
          fallbackSources,
        });
        if (!isMountedRef.current) return;

        dispatch({ type: 'CAPTURE_RESOLVED', location });

        const now = toIsoTimestamp();
        // 리뷰 발견 — 이 쓰기를 draftWriteQueueRef에 등록해, CAPTURE_RESOLVED
        // 직후(이 upsert가 끝나기 전) 드래그가 들어와도 handleDragEnd의 UPDATE가
        // 이 INSERT보다 먼저 실행되지 않도록 순서를 보장한다.
        const draftWrite = upsertDraft(db, {
          lat: location.lat,
          lng: location.lng,
          accuracyMeters: location.accuracyMeters,
          locationSource: location.locationSource,
          localDateKey: resolveLocalDateKey(new Date()),
          timezoneAtCapture: resolveTimeZone(),
          now,
        });
        draftWriteQueueRef.current = draftWrite.catch(() => {});
        await draftWrite;
      } catch (error) {
        // 프로미스 미삼킴 규약 — 캡처 중 예외가 나도 CAPTURING에 갇히지 않도록
        // DISMISS를 dispatch해 IDLE로 되돌린다(T-3-24).
        console.error('Failed to capture check-in location', error);
        if (isMountedRef.current) {
          dispatch({ type: 'DISMISS' });
        }
        return;
      } finally {
        isCheckinInFlightRef.current = false;
      }

      // 여기 도달했다는 것은 확인 핀이 이미 CONFIRM 상태로 떠 있고 드래프트도
      // SQLite에 안전하게 저장됐다는 뜻이다 — 카메라 이동은 순수 시각 효과이므로
      // 실패해도 로그만 남기고 진행 상황은 그대로 둔다.
      try {
        await waitForMapReady();
        mapRef.current?.animateToRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: MAP_REGION_DELTA,
          longitudeDelta: MAP_REGION_DELTA,
        });
      } catch (error) {
        console.error('Failed to animate map to captured check-in location', error);
      }
    })();
  }, [db, state.phase]);

  // 드래그가 끝나면 리듀서(applyDraggedSource)가 gps_dragged 전이를 담당하고,
  // 같은 좌표를 드래프트에도 즉시 반영한다(.catch(console.error) — 미삼킴 규약).
  const handleDragEnd = useCallback(
    (event: MarkerDragStartEndEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      dispatch({ type: 'DRAG_PIN', lat: latitude, lng: longitude });
      // WR-01 리뷰 대응 — applyDraggedSource(location.ts)는 드래그된 핀의
      // accuracyMeters를 항상 null로 만든다("손으로 옮긴 위치라 GPS 정확도 수치가
      // 더 이상 의미를 갖지 않기 때문"). 드래프트에도 그 무효화를 명시적으로 반영해야
      // 앱이 드래그 직후 강제종료됐다가 복구됐을 때 stale한 accuracy 값이 checkins에
      // 영구히 남는 것을 막는다.
      //
      // 리뷰 발견 — draftWriteQueueRef 뒤에 체이닝해 이 UPDATE가 handleCheckinPress의
      // upsertDraft(INSERT OR REPLACE)보다 먼저 실행되지 않도록 직렬화한다. 직접
      // updateDraftCoordinate를 부르면, 확인 핀이 draggable해지는 CAPTURE_RESOLVED
      // dispatch 시점과 upsertDraft 완료 시점 사이의 좁은 창에서 빠른 드래그가 아직
      // 존재하지 않는 row에 UPDATE를 실행해(SQLite가 0행 적용을 에러 없이 조용히
      // 넘김) 드래그 보정이 유실될 수 있었다.
      const write = draftWriteQueueRef.current.then(() =>
        updateDraftCoordinate(db, {
          lat: latitude,
          lng: longitude,
          accuracyMeters: null,
          now: toIsoTimestamp(),
        })
      );
      draftWriteQueueRef.current = write.catch(() => {});
      write.catch((error) => {
        console.error('Failed to update draft coordinate after drag', error);
      });
    },
    [db]
  );

  // "확인"/"다시 시도"가 공유하는 단일 저장 함수(03-10-PLAN.md Task 1). 자동 재시도
  // 1회는 commitCheckin 내부(runWithSingleRetry)에 이미 캡슐화돼 있으므로 여기서는
  // 재시도 카운터를 두지 않는다(03-RESEARCH.md Pitfall 4) — "다시 시도" 버튼은 이
  // 함수를 그대로 재호출할 뿐이다.
  const handleSaveCheckin = useCallback(() => {
    // WR-04 리뷰 대응 — 아래 state.phase 가드보다 먼저, 리렌더 유무와 무관하게
    // 즉시 갱신되는 ref로 이미 진행 중인 저장을 걸러낸다(더블탭 레이스 방지).
    if (isSaveInFlightRef.current) return;
    // SAVING 중 중복 탭 방지 가드.
    if (state.phase === 'SAVING') return;
    if (state.phase !== 'CONFIRM' && state.phase !== 'SAVE_FAILED') return;
    if (!state.pin) return;

    isSaveInFlightRef.current = true;
    const pin = state.pin;
    dispatch({ type: state.phase === 'CONFIRM' ? 'TAP_CONFIRM' : 'TAP_RETRY' });

    // 재시도 시 첫 TAP_CONFIRM에서 만든 id를 재사용한다 — 새 id를 매번 만들면 재시도가
    // 중복 체크인 row를 만든다(T-3-25).
    if (!pendingCheckinIdRef.current) {
      pendingCheckinIdRef.current = defaultCryptoDeps.randomUUID();
    }
    const id = pendingCheckinIdRef.current;

    // "확인"(또는 "다시 시도") 탭 시점이 곧 최종 타임스탬프를 확정하는 시점이다
    // (03-RESEARCH.md Pattern 4) — GPS 캡처 시점이 아니라 여기서 timestampUtc를 새로
    // 읽는다.
    const params: NewCheckinParams = {
      id,
      timestampUtc: toIsoTimestamp(),
      localDateKey: resolveLocalDateKey(new Date()),
      timezoneAtCapture: resolveTimeZone(),
      lat: pin.lat,
      lng: pin.lng,
      accuracyMeters: pin.accuracyMeters,
      locationSource: pin.locationSource,
    };

    commitCheckin(db, params)
      .then((result) => {
        isSaveInFlightRef.current = false;
        if (!isMountedRef.current) return;
        if (result.ok) {
          // 다음 체크인 사이클을 위해 초기화 — 이 체크인은 이제 SAVED 상태로
          // 확정됐으므로 더 이상 재사용할 id가 아니다.
          pendingCheckinIdRef.current = null;
          dispatch({ type: 'SAVE_SUCCEEDED', id: result.id });
          // 방금 저장한 체크인이 즉시 핀으로 나타나게 한다(04-05-PLAN.md).
          reloadTodayCheckins();
        } else {
          dispatch({ type: 'SAVE_FAILED' });
        }
      })
      .catch((error) => {
        isSaveInFlightRef.current = false;
        // 프로미스 미삼킴 규약 — 예외도 SAVE_FAILED로 흡수한다.
        console.error('Failed to commit check-in', error);
        if (isMountedRef.current) {
          dispatch({ type: 'SAVE_FAILED' });
        }
      });
  }, [db, state.phase, state.pin, reloadTodayCheckins]);

  // 메모/사진을 현재 checkinId row에 flush한다 — TextInput 블러 시점과 앱 백그라운드
  // 전환 시점 두 곳에서 호출된다(디바운스 자동저장은 Phase 7 REQ-reflection-autosave
  // 스코프이므로 여기서 만들지 않는다). canEditNoteAndPhoto(state)가 true인 SAVED
  // 상태에서만 checkinId가 존재하므로 그 가드로 충분하다.
  const flushNoteAndPhoto = useCallback(() => {
    const current = stateRef.current;
    if (!current.checkinId) return;
    updateCheckinNoteAndPhoto(db, current.checkinId, {
      note: current.note || null,
      photoPath: current.photo?.uri ?? null,
      now: toIsoTimestamp(),
    }).catch((error) => {
      console.error('Failed to flush check-in note/photo', error);
    });
  }, [db]);

  // CR-01 리뷰 대응 — SAVED 카드를 닫고 다음 체크인을 시작할 수 있는 유일한 경로.
  // 리듀서의 DISMISS는 이미 존재하지만(IDLE 초기화), 이전에는 캡처 실패 catch
  // 블록에서만 dispatch돼 SAVED 도달 이후에는 세션 안에서 다시 IDLE로 돌아갈 방법이
  // 없었다(SAVED 카드가 영구적으로 남아 체크인 버튼이 다시 뜨지 않음). note/photo는
  // 이미 각자 시점에 flush됐지만(TextInput blur, 사진 선택 즉시 반영) 방어적으로
  // 한 번 더 flush한 뒤 DISMISS한다. SAVE_FAILED/CONFIRM 등 다른 phase는 각자의
  // 명시적 버튼(확인/다시 시도)이 있으므로 건드리지 않는다.
  //
  // 2026-08-28 추가 — 원래는 03-UI-SPEC.md에 정의된 별도 "닫기" 버튼/카피가 없어서
  // 지도 위 빈 영역 탭 제스처 하나로만 노출했으나(CR-01), 사용자가 사진/메모 저장
  // 여부를 확인할 명시적 지점이 없다는 피드백을 받아 CheckinActionCard의 "완료"
  // 버튼도 이 동일한 핸들러를 공유한다 — 완료 버튼이 주 경로, 지도 탭은 보조 경로.
  const handleFinishCheckin = useCallback(() => {
    if (stateRef.current.phase !== 'SAVED') return;
    flushNoteAndPhoto();
    dispatch({ type: 'DISMISS' });
    // 메모/사진 flush 결과를 리스트 미리보기에 반영한다(04-05-PLAN.md). reloadTodayCheckins는
    // 안정적인 db에만 의존하는 참조 안정 콜백이라 deps 배열에 추가하지 않아도 최신
    // 함수를 참조한다 — checkin-wiring Test 42의 deps 배열 계약([flushNoteAndPhoto])을
    // 그대로 유지한다.
    reloadTodayCheckins();
  }, [flushNoteAndPhoto]);

  // 미저장 이탈 안내 + 메모/사진 백그라운드 flush를 한 구독으로 처리한다. 이 리스너는
  // src/app/_layout.tsx의 알림 자가진단 리스너와 목적이 다르다 — 그쪽은 'active' 진입만
  // 감지해 알림 스케줄 무결성을 재검사하고, 이 리스너는 'active'를 벗어나는 전환(배경
  // 전환)에 반응해 (1) SAVE_FAILED 상태의 미저장 이탈 안내와 (2) SAVED 상태의 메모/사진
  // flush를 수행한다. 드래프트 row 삭제 함수는 여기서 호출하지 않는다 — 드래프트는
  // SQLite에 그대로 남아 다음 실행 시 복구 제안으로 이어진다(D-05).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        unsavedExitAlertShownRef.current = false;
        // 백그라운드에 있던 사이 날짜가 바뀌었거나 시간이 흐른 경우를 흡수한다
        // (04-05-PLAN.md).
        reloadTodayCheckins();
        return;
      }
      const current = stateRef.current;
      if (current.phase === 'SAVE_FAILED' && !unsavedExitAlertShownRef.current) {
        unsavedExitAlertShownRef.current = true;
        Alert.alert(CHECKIN_COPY.unsavedExitAlert, undefined, [
          { text: CHECKIN_COPY.unsavedExitAlertButton },
        ]);
      }
      if (canEditNoteAndPhoto(current)) {
        flushNoteAndPhoto();
      }
    });
    return () => subscription.remove();
  }, [flushNoteAndPhoto, reloadTodayCheckins]);

  // 사진 액션시트 — photos.ts의 옵션/취소 인덱스/출처 매핑 상수를 그대로 소비한다
  // (문자열/인덱스를 화면에 하드코딩하지 않는다). ActionSheetIOS는 OS 네이티브
  // 컴포넌트이며 커스텀 리테마하지 않는다(03-UI-SPEC.md 확정).
  const handlePickPhoto = useCallback(() => {
    if (!state.checkinId) return;
    const checkinId = state.checkinId;

    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...PHOTO_ACTION_SHEET_OPTIONS],
        cancelButtonIndex: PHOTO_ACTION_SHEET_CANCEL_INDEX,
      },
      (buttonIndex) => {
        const source = PHOTO_SOURCE_BY_ACTION_SHEET_INDEX[buttonIndex];
        if (!source) return;

        pickAndCopyPhoto(source)
          .then((result) => {
            if (!isMountedRef.current || result === null) return;
            if ('error' in result) {
              dispatch({ type: 'PHOTO_FAILED' });
              return;
            }
            dispatch({ type: 'PHOTO_PICKED', photo: result });
            // 사진 선택 즉시 체크인 row에 반영한다 — 메모는 그 시점의 최신 값을
            // stateRef에서 읽어 함께 기록한다(updateCheckinNoteAndPhoto가 두 필드를
            // 함께 받는 계약이기 때문).
            updateCheckinNoteAndPhoto(db, checkinId, {
              note: stateRef.current.note || null,
              photoPath: result.uri,
              now: toIsoTimestamp(),
            }).catch((error) => {
              console.error('Failed to persist picked photo to checkin row', error);
            });
          })
          .catch((error) => {
            console.error('Failed to pick and copy photo', error);
            if (isMountedRef.current) {
              dispatch({ type: 'PHOTO_FAILED' });
            }
          });
      }
    );
  }, [db, state.checkinId]);

  // 메모 입력 — 로컬 상태는 매 키 입력마다 갱신하되(카드가 이미 controlled input으로
  // 렌더), DB 반영은 flushNoteAndPhoto가 블러/백그라운드 시점에만 수행한다.
  const handleChangeNote = useCallback(
    (note: string) => {
      if (!state.checkinId) return;
      dispatch({ type: 'NOTE_CHANGED', note });
    },
    [state.checkinId]
  );

  if (shouldShowPriming(permission)) {
    return <Redirect href="/priming" />;
  }

  return (
    <View style={styles.screen} onLayout={handleContainerLayout}>
      {/* StyleSheet.absoluteFillObject는 이 RN 버전에 존재하지 않는다(타입 정의 기준
          absoluteFill만 export됨) — 동일한 절대위치 전체채움 스타일 객체인
          absoluteFill을 대신 쓴다. */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        onRegionChangeComplete={handleRegionChangeComplete}
        onPanDrag={handlePanDrag}
        onMapReady={handleMapReady}
        onPress={handleFinishCheckin}
      >
        {trajectoryCoordinates.length >= 2 && (
          <Polyline
            coordinates={trajectoryCoordinates}
            strokeColor={colors.pinSoft}
            strokeWidth={TRAJECTORY_STROKE_WIDTH}
          />
        )}

        {todayCheckins.map((checkin) => (
          <Marker
            key={checkin.id}
            coordinate={{ latitude: checkin.lat, longitude: checkin.lng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pinWrapper}>
              <View style={[styles.pinDrop, styles.pinSaved]} />
            </View>
          </Marker>
        ))}

        {state.pin && showActionCard && (
          <Marker
            draggable={state.phase === 'CONFIRM'}
            coordinate={{ latitude: state.pin.lat, longitude: state.pin.lng }}
            anchor={{ x: 0.5, y: 1 }}
            hitSlop={PIN_HIT_SLOP}
            onDragEnd={handleDragEnd}
          >
            <View style={styles.pinWrapper}>
              <View style={[styles.pinDrop, pinStyleForSource(state.pin.locationSource)]} />
            </View>
          </Marker>
        )}
      </MapView>

      <View style={[styles.bannerStack, { paddingTop: insets.top }]}>
        <NotificationDeniedBanner />
        <LocationDeniedBanner />
      </View>

      {showActionCard ? (
        // 카드가 화면 하단 고정이라 iOS 키보드에 가려질 수 있다 — 카드 컨테이너에만
        // KeyboardAvoidingView를 적용해 MapView 전체화면 레이아웃은 건드리지 않는다.
        // 이 프로젝트는 iOS 전용이라 플랫폼별 분기 자체를 두지 않는다(PROJECT.md 확정).
        <KeyboardAvoidingView behavior="padding" style={styles.actionCardContainer}>
          <CheckinActionCard
            phase={state.phase}
            onConfirm={handleSaveCheckin}
            onRetry={handleSaveCheckin}
            photo={state.photo}
            photoError={state.photoError}
            note={state.note}
            onPickPhoto={handlePickPhoto}
            onChangeNote={handleChangeNote}
            onNoteBlur={flushNoteAndPhoto}
            onComplete={handleFinishCheckin}
          />
        </KeyboardAvoidingView>
      ) : (
        <>
          {/* D-04 마운트 게이트 — showActionCard가 true인 동안(위 분기) 이 시트는
              opacity/display/enabled로 숨겨지는 게 아니라 트리에서 완전히 사라진다
              (CheckinActionCard.tsx의 "비활성화가 아니라 미마운트" 계약과 동일하게).
              containerHeight <= 0(레이아웃 측정 전)이면 TodayBottomSheet 자신이 null을
              반환한다(04-04-PLAN.md 계약). */}
          <TodayBottomSheet
            checkins={todayCheckins}
            containerHeight={containerHeight}
            animatedPosition={sheetPosition}
          />
          <Reanimated.View style={[styles.checkinButtonContainer, floatingButtonStyle]}>
            <Pressable
              onPress={handleCheckinPress}
              disabled={isCapturing}
              accessibilityRole="button"
              accessibilityLabel="체크인"
              style={[styles.checkinButton, isCapturing && styles.checkinButtonCapturing]}
            >
              <Animated.View style={{ opacity: buttonContentOpacity }}>
                {isCapturing ? (
                  <ActivityIndicator color={colors.pin} />
                ) : (
                  <Text style={[typography.placeName, styles.checkinButtonLabel]}>
                    {CHECKIN_COPY.checkinCta}
                  </Text>
                )}
              </Animated.View>
            </Pressable>
          </Reanimated.View>
          <Reanimated.View
            style={[styles.recenterButtonContainer, floatingButtonStyle, { right: spacing.lg }]}
          >
            <Pressable
              onPress={handleRecenterPress}
              accessibilityRole="button"
              accessibilityLabel="현재 위치로 이동"
              style={styles.recenterButton}
            >
              <SymbolView
                name={orientationMode === 'compass' ? 'location.north.line.fill' : 'location.fill'}
                tintColor={colors.pin}
              />
            </Pressable>
          </Reanimated.View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bannerStack: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  checkinButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  checkinButton: {
    height: 48,
    minWidth: 44,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.pin,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinButtonCapturing: {
    backgroundColor: colors.pinSoft,
  },
  checkinButtonLabel: {
    color: colors.surface,
  },
  recenterButtonContainer: {
    position: 'absolute',
  },
  recenterButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  actionCardContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  // 구글맵 스타일 물방울(teardrop) 핀 — SVG 없이 순수 View/StyleSheet로 구현한다
  // (react-native-gesture-handler를 안 쓰는 것과 같은 이유로 불필요한 의존성 추가를
  // 피한다). 정사각형의 세 모서리만 완전히 둥글리고 한 모서리(좌하단)는 각지게 남긴
  // 뒤 -45도 회전시키면 뾰족한 끝이 바로 아래를 가리키는 물방울 모양이 된다 — CSS
  // 진영에서 널리 쓰이는 표준 기법과 동일하다. 회전은 레이아웃 박스 크기에 영향을
  // 주지 않으므로(react-native transform은 순수 시각 효과), 실제 뾰족한 끝은
  // pinDrop 자신의 28px 박스보다 아래로 튀어나온다 — pinWrapper의 높이(34)가 그
  // 여유 공간을 확보하고, Marker의 anchor={{x:0.5, y:1}}가 pinWrapper 하단(≈ 뾰족한
  // 끝 위치)을 실제 좌표에 고정한다. 이전 점(dot) 마커는 iOS 네이티브 "내 위치"
  // 파란 점과 겹쳐 보여 구분이 어렵다는 피드백으로 모양을 바꿨다 — 색상(accent/
  // accentSoft 팔레트)은 DESIGN.md의 "빨강 계열 금지" 원칙을 지켜 그대로 유지한다.
  pinWrapper: {
    width: 28,
    height: 34,
    alignItems: 'center',
  },
  pinDrop: {
    width: 28,
    height: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '-45deg' }],
  },
  pinConfident: {
    backgroundColor: colors.pin,
  },
  // 저장된 체크인 핀(D-10) — 원본 location_source에 따른 3단계 시각 구분을 저장
  // 후에는 유지하지 않는다(04-UI-SPEC.md §저장된 체크인 핀). 테두리 없음.
  pinSaved: {
    backgroundColor: colors.pinSoft,
  },
  pinFallback: {
    backgroundColor: colors.pinSoft,
    borderWidth: 2,
    borderColor: colors.pin,
  },
  pinDragged: {
    backgroundColor: colors.pin,
    borderWidth: 2,
    borderColor: colors.pinSoft,
  },
});
