// src/app/index.tsx
// Phase 3(체크인 코어 루프, 03-09-PLAN.md Task 1) — Phase 1의 부팅 확인
// 플레이스홀더를 대체하는 최소 지도 화면(03-CONTEXT.md D-06). 원래 Phase 4(오늘 뷰)가
// 이 자리를 채울 예정이었지만, 오늘 뷰가 아직 없어 체크인 버튼과 확인 핀 플로우를
// 얹을 화면이 필요해 Phase 3가 먼저 이 자리를 쓴다. Phase 4는 이 지도 위에
// 바텀시트와 리스트를 씌우면 되므로 지도 렌더링과 캡처 로직을 그대로 재사용한다.
//
// 배너 스택(NotificationDeniedBanner 위, LocationDeniedBanner 아래)의 현재 위치
// (지도 상단, 세이프에어리어 아래)도 최종 위치가 아니다 — Phase 4가 오늘 뷰를 만들
// 때 두 배너 모두 탭바 위로 이관한다.
//
// 지도 스타일 토큰 결정(03-09-PLAN.md 지도 스타일 토큰 결정 항목): colors.mapLand,
// colors.mapRoad, colors.mapWater는 이 화면에서 쓰지 않는다. react-native-maps의
// customMapStyle prop은 구글 지도 provider 전용이고 이 phase는 API 키가 필요 없는
// 애플 지도 기본 provider를 쓴다(provider 미지정). accent 예산은 지도 위 확인
// 핀에만 쓴다(Task 2에서 추가됨).
import { useEffect, useReducer, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Redirect } from 'expo-router';
import MapView from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, motion, radius, spacing, typography } from '../theme/tokens';
import { fetchNotificationPermission, shouldShowPriming } from '../notifications/permissions';
import type { PermissionSnapshot } from '../notifications/permissions';
import { NotificationDeniedBanner } from '../components/NotificationDeniedBanner';
import { LocationDeniedBanner } from '../components/LocationDeniedBanner';
import { checkinReducer, initialCheckinState, CHECKIN_COPY } from '../checkin/checkinFlow';

export default function Index() {
  // 이번 task는 지도/배너/버튼 배선까지만 담당한다 — db는 Task 2(위치 캡처/드래프트
  // upsert)부터 실제로 쓰인다. SQLiteProvider 트리 안에서 훅을 미리 호출해 Task 2가
  // 이어받을 자리를 남겨둔다.
  useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [permission, setPermission] = useState<PermissionSnapshot | null>(null);
  const [state, dispatch] = useReducer(checkinReducer, initialCheckinState);

  const buttonContentOpacity = useState(() => new Animated.Value(1))[0];

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

  // 실제 캡처/권한 요청/드래프트 upsert 배선은 03-09-PLAN.md Task 2에서 채운다.
  // 이 task는 IDLE → CAPTURING 전환만 시각적으로 확인 가능하게 해 둔다.
  const handleCheckinPress = () => {
    if (state.phase !== 'IDLE') return;
    dispatch({ type: 'TAP_CHECKIN' });
  };

  if (shouldShowPriming(permission)) {
    return <Redirect href="/priming" />;
  }

  return (
    <View style={styles.screen}>
      {/* StyleSheet.absoluteFillObject는 이 RN 버전에 존재하지 않는다(타입 정의 기준
          absoluteFill만 export됨) — 동일한 절대위치 전체채움 스타일 객체인
          absoluteFill을 대신 쓴다. */}
      <MapView style={StyleSheet.absoluteFill} showsUserLocation />

      <View style={[styles.bannerStack, { paddingTop: insets.top }]}>
        <NotificationDeniedBanner />
        <LocationDeniedBanner />
      </View>

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
});
