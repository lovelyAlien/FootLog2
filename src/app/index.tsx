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
// Task 2(체크인 탭 → 권한 요청 → 위치 캡처 → 확인 핀 드롭 → 드래프트 upsert):
// "확인"/재시도/사진/메모 배선은 03-10에서 채운다. 이 화면은 지도, 캡처, 핀 드래그,
// 드래프트 즉시 영속화까지만 담당한다.
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
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
import { getLatestCheckinCoordinate } from '../checkin/checkinRepo';
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

  // TODO(03-10): onConfirm/onRetry/onPickPhoto/onChangeNote를 실제 저장·사진
  // 플로우로 교체한다. 이 plan은 지도, 캡처, 핀 드래그, 드래프트 즉시 영속화까지만
  // 배선한다.
  const handleConfirmNoop = useCallback(() => {}, []);
  const handleRetryNoop = useCallback(() => {}, []);
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
            onConfirm={handleConfirmNoop}
            onRetry={handleRetryNoop}
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
