// src/app/index.tsx
// Phase 3(체크인 코어 루프, 03-09-PLAN.md) — Phase 1의 부팅 확인 플레이스홀더를
// 대체하는 최소 지도 화면(03-CONTEXT.md D-06). 원래 Phase 4(오늘 뷰)가 이 자리를
// 채울 예정이었지만, 오늘 뷰가 아직 없어 체크인 버튼과 확인 핀 플로우를 얹을 화면이
// 필요해 Phase 3가 먼저 이 자리를 쓴다. Phase 4는 이 지도 위에 바텀시트와 리스트를
// 씌우면 되므로 지도 렌더링, GPS 캡처, 확인 핀 드래그 로직을 그대로 재사용한다.
//
// 배너 스택(NotificationDeniedBanner 위, LocationDeniedBanner 아래)의 현재 위치
// (지도 상단, 세이프에어리어 아래)도 최종 위치가 아니다 — Phase 4가 오늘 뷰를 만들
// 때 두 배너 모두 탭바 위로 이관한다.
//
// 지도 스타일 토큰 결정(03-09-PLAN.md 지도 스타일 토큰 결정 항목): colors.mapLand,
// colors.mapRoad, colors.mapWater는 이 화면에서 쓰지 않는다. react-native-maps의
// customMapStyle prop은 구글 지도 provider 전용이고 이 phase는 API 키가 필요 없는
// 애플 지도 기본 provider를 쓴다(provider 미지정). accent 예산은 체크인 버튼과
// 지도 위 확인 핀(DESIGN.md 승인 6개 용도 중 "체크인 버튼"과 "지도 마크")에만 쓴다.
//
// 03-09: 체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 → 드래프트 upsert.
// 03-10 Task 1: "확인"/"다시 시도" → commitCheckin 배선 + 미저장 이탈 안내.
// 사진/메모 배선(03-10 Task 2)과 드래프트 복구(03-10 Task 3)는 아래 각 절 참고.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Redirect } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';
import type { MarkerDragStartEndEvent, Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, radius, spacing, typography } from '../theme/tokens';
import { fetchNotificationPermission, shouldShowPriming } from '../notifications/permissions';
import type { PermissionSnapshot } from '../notifications/permissions';
import { NotificationDeniedBanner } from '../components/NotificationDeniedBanner';
import { LocationDeniedBanner } from '../components/LocationDeniedBanner';
import { CheckinActionCard } from '../components/CheckinActionCard';
import { checkinReducer, initialCheckinState, CHECKIN_COPY } from '../checkin/checkinFlow';
import { requestLocationPermission } from '../checkin/permissions';
import { resolveCheckinLocation } from '../checkin/location';
import type { FallbackSources } from '../checkin/location';
import { upsertDraft, updateDraftCoordinate } from '../checkin/draftRepo';
import { commitCheckin, getLatestCheckinCoordinate } from '../checkin/checkinRepo';
import type { NewCheckinParams } from '../checkin/checkinRepo';
import { defaultCryptoDeps } from '../checkin/deps';
import { resolveLocalDateKey, resolveTimeZone, toIsoTimestamp } from '../checkin/localDate';
import type { LocationSource } from '../db/schema';

// 확인 핀으로 카메라를 이동시킬 때 쓰는 줌 레벨 — GPS 좌표 근방을 자연스럽게 보여줄
// 정도의 값이며, 창업자 실기기 수동 QA를 위한 근사치일 뿐 정밀 계산값이 아니다.
const MAP_REGION_DELTA = 0.01;

// 확인 핀 히트 영역 확장값 — 24px 원을 최소 터치 타겟 크기까지 넓힌다.
const PIN_HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

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

  const mapRef = useRef<MapView>(null);
  const lastMapCoordinateRef = useRef<{ lat: number; lng: number } | null>(null);
  const isMountedRef = useRef(true);
  const buttonContentOpacity = useState(() => new Animated.Value(1))[0];

  // 첫 TAP_CONFIRM 시점에 만든 체크인 id — "다시 시도"가 같은 id를 재사용해 중복 row를
  // 만들지 않도록 리듀서 상태가 아니라 ref에 보관한다(T-3-25). commitCheckin이
  // ok:true를 반환한 뒤 다음 체크인 사이클을 위해 초기화한다.
  const pendingCheckinIdRef = useRef<string | null>(null);
  // 미저장 이탈 안내(Alert)를 정확히 1회만 노출하기 위한 플래그.
  const unsavedExitAlertShownRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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

  const isCapturing = state.phase === 'CAPTURING';
  const showActionCard = state.phase !== 'IDLE' && !isCapturing;

  // 체크인 버튼과 로딩 인디케이터 사이 전환에 크로스페이드를 적용한다
  // (motion.saveStateCrossfadeMs, 03-UI-SPEC.md 체크인 알약버튼 절).
  useEffect(() => {
    buttonContentOpacity.setValue(0);
    Animated.timing(buttonContentOpacity, {
      toValue: 1,
      duration: motion.saveStateCrossfadeMs,
      useNativeDriver: true,
    }).start();
  }, [isCapturing, buttonContentOpacity]);

  const handleRegionChangeComplete = useCallback((region: Region) => {
    lastMapCoordinateRef.current = { lat: region.latitude, lng: region.longitude };
  }, []);

  // 체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 → 드래프트 upsert(D-03: 확인
  // 핀이 뜨는 즉시 영속화). Phase 3가 requestForegroundPermissionsAsync 호출을
  // 소유한다(03-05가 확정한 책임 경계) — requestLocationPermission 내부의
  // undetermined 가드가 반복 프롬프트를 막는다(T-3-15).
  const handleCheckinPress = useCallback(() => {
    if (state.phase !== 'IDLE') return;
    dispatch({ type: 'TAP_CHECKIN' });

    (async () => {
      try {
        const nextPermission = await requestLocationPermission();
        const latestCheckinCoordinate = await getLatestCheckinCoordinate(db);
        const fallbackSources: FallbackSources = {
          latestCheckinCoordinate,
          lastMapCoordinate: lastMapCoordinateRef.current,
        };
        const location = await resolveCheckinLocation({
          permission: nextPermission,
          fallbackSources,
        });
        if (!isMountedRef.current) return;

        dispatch({ type: 'CAPTURE_RESOLVED', location });

        const now = toIsoTimestamp();
        await upsertDraft(db, {
          lat: location.lat,
          lng: location.lng,
          accuracyMeters: location.accuracyMeters,
          locationSource: location.locationSource,
          localDateKey: resolveLocalDateKey(new Date()),
          timezoneAtCapture: resolveTimeZone(),
          now,
        });

        mapRef.current?.animateToRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: MAP_REGION_DELTA,
          longitudeDelta: MAP_REGION_DELTA,
        });
      } catch (error) {
        // 프로미스 미삼킴 규약 — 캡처 중 예외가 나도 CAPTURING에 갇히지 않도록
        // DISMISS를 dispatch해 IDLE로 되돌린다(T-3-24).
        console.error('Failed to capture check-in location', error);
        if (isMountedRef.current) {
          dispatch({ type: 'DISMISS' });
        }
      }
    })();
  }, [db, state.phase]);

  // 드래그가 끝나면 리듀서(applyDraggedSource)가 gps_dragged 전이를 담당하고,
  // 같은 좌표를 드래프트에도 즉시 반영한다(.catch(console.error) — 미삼킴 규약).
  const handleDragEnd = useCallback(
    (event: MarkerDragStartEndEvent) => {
      const { latitude, longitude } = event.nativeEvent.coordinate;
      dispatch({ type: 'DRAG_PIN', lat: latitude, lng: longitude });
      updateDraftCoordinate(db, { lat: latitude, lng: longitude, now: toIsoTimestamp() }).catch(
        (error) => {
          console.error('Failed to update draft coordinate after drag', error);
        }
      );
    },
    [db]
  );

  // "확인"/"다시 시도"가 공유하는 단일 저장 함수(03-10-PLAN.md Task 1). 자동 재시도
  // 1회는 commitCheckin 내부(runWithSingleRetry)에 이미 캡슐화돼 있으므로 여기서는
  // 재시도 카운터를 두지 않는다(03-RESEARCH.md Pitfall 4) — "다시 시도" 버튼은 이
  // 함수를 그대로 재호출할 뿐이다.
  const handleSaveCheckin = useCallback(() => {
    // SAVING 중 중복 탭 방지 가드.
    if (state.phase === 'SAVING') return;
    if (state.phase !== 'CONFIRM' && state.phase !== 'SAVE_FAILED') return;
    if (!state.pin) return;

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
        if (!isMountedRef.current) return;
        if (result.ok) {
          // 다음 체크인 사이클을 위해 초기화 — 이 체크인은 이제 SAVED 상태로
          // 확정됐으므로 더 이상 재사용할 id가 아니다.
          pendingCheckinIdRef.current = null;
          dispatch({ type: 'SAVE_SUCCEEDED', id: result.id });
        } else {
          dispatch({ type: 'SAVE_FAILED' });
        }
      })
      .catch((error) => {
        // 프로미스 미삼킴 규약 — 예외도 SAVE_FAILED로 흡수한다.
        console.error('Failed to commit check-in', error);
        if (isMountedRef.current) {
          dispatch({ type: 'SAVE_FAILED' });
        }
      });
  }, [db, state.phase, state.pin]);

  // 미저장 이탈 안내 — SAVE_FAILED 상태에서 앱이 백그라운드로 전환되면(화면을
  // 벗어나는 것과 동등하게 취급) OS 네이티브 Alert을 정확히 1회 노출한다(정보 제공
  // 목적, 이탈 자체를 막지 않는다). 드래프트 row 삭제 함수는 여기서 호출하지 않는다 —
  // 드래프트는 SQLite에 그대로 남아 다음 실행 시 복구 제안으로 이어진다(D-05).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        nextAppState !== 'active' &&
        state.phase === 'SAVE_FAILED' &&
        !unsavedExitAlertShownRef.current
      ) {
        unsavedExitAlertShownRef.current = true;
        Alert.alert(CHECKIN_COPY.unsavedExitAlert, undefined, [
          { text: CHECKIN_COPY.unsavedExitAlertButton },
        ]);
      }
      if (nextAppState === 'active') {
        unsavedExitAlertShownRef.current = false;
      }
    });
    return () => subscription.remove();
  }, [state.phase]);

  // TODO(03-10 Task 2): onPickPhoto/onChangeNote를 실제 사진/메모 배선으로 교체한다.
  const handlePickPhotoNoop = useCallback(() => {}, []);
  const handleChangeNoteNoop = useCallback((_note: string) => {}, []);

  if (shouldShowPriming(permission)) {
    return <Redirect href="/priming" />;
  }

  return (
    <View style={styles.screen}>
      {/* StyleSheet.absoluteFillObject는 이 RN 버전에 존재하지 않는다(타입 정의 기준
          absoluteFill만 export됨) — 동일한 절대위치 전체채움 스타일 객체인
          absoluteFill을 대신 쓴다. */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {state.pin && showActionCard && (
          <Marker
            draggable
            coordinate={{ latitude: state.pin.lat, longitude: state.pin.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            hitSlop={PIN_HIT_SLOP}
            onDragEnd={handleDragEnd}
          >
            <View style={[styles.pinBase, pinStyleForSource(state.pin.locationSource)]} />
          </Marker>
        )}
      </MapView>

      <View style={[styles.bannerStack, { paddingTop: insets.top }]}>
        <NotificationDeniedBanner />
        <LocationDeniedBanner />
      </View>

      {showActionCard ? (
        <View style={styles.actionCardContainer}>
          <CheckinActionCard
            phase={state.phase}
            onConfirm={handleSaveCheckin}
            onRetry={handleSaveCheckin}
            photo={state.photo}
            photoError={state.photoError}
            note={state.note}
            onPickPhoto={handlePickPhotoNoop}
            onChangeNote={handleChangeNoteNoop}
          />
        </View>
      ) : (
        <View style={[styles.checkinButtonContainer, { bottom: insets.bottom + spacing.xl }]}>
          <Pressable
            onPress={handleCheckinPress}
            disabled={isCapturing}
            accessibilityRole="button"
            accessibilityLabel="체크인"
            style={[styles.checkinButton, isCapturing && styles.checkinButtonCapturing]}
          >
            <Animated.View style={{ opacity: buttonContentOpacity }}>
              {isCapturing ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Text style={[typography.placeName, styles.checkinButtonLabel]}>
                  {CHECKIN_COPY.checkinCta}
                </Text>
              )}
            </Animated.View>
          </Pressable>
        </View>
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
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkinButtonCapturing: {
    backgroundColor: colors.accentSoft,
  },
  checkinButtonLabel: {
    color: colors.surface,
  },
  actionCardContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  pinBase: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  pinConfident: {
    backgroundColor: colors.accent,
  },
  pinFallback: {
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
  },
  pinDragged: {
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.accentSoft,
  },
});
