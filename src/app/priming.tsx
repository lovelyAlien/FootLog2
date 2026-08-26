// src/app/priming.tsx
// Plan 02-06 — 알림 OS 권한 다이얼로그 전에 뜨는 커스텀 priming 전체화면.
// expo-router 라우트: 파일 경로가 곧 `/priming`이다(app.json experiments.typedRoutes:
// true라 이 파일이 존재해야 router.replace('/priming') 호출이 타입 체크를 통과한다 —
// Plan 07이 그 호출을 배선한다).
//
// T-02-16 완화(threat_model): 이 화면은 iOS 시스템 권한 다이얼로그를 흉내 내지
// 않는다 — 전체화면 colors.background 단색 배경 + 앱 자체 타이포/필 버튼이며,
// 시스템 알림 스타일(중앙 카드 + 파란 텍스트 버튼)을 모사하지 않는다.
//
// colors.accent 미사용 — 명시적 결정(02-UI-SPEC.md §Color): DESIGN.md는 accent를
// 정확히 6개 승인된 용도(체크인 버튼/현재 위치 링/지도 마크/궤적선/오늘 밑줄/
// 스크러버 표시)로만 제한하며, 이 priming 화면의 "허용하기" 버튼은 그 목록에
// 없어 7번째 용도로 확장하지 않는다. 대신 colors.textPrimary(웜 니어블랙) 필 버튼을 쓴다.
//
// typography.journalEntry(Newsreader 이탤릭 세리프) 미사용 — 사용자 작성 텍스트
// 전용 토큰이며, 이 화면 텍스트는 전부 시스템 UI 크롬이다.
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, radius, spacing, typography } from '../theme/tokens';
// 네임스페이스 import — 정적 계약 테스트가 각 함수 식별자를 호출부 1곳에서만
// 세도록, import 목록에는 함수명을 나열하지 않고 모듈 객체만 가져온다
// (Plan 04 산출물 계약: 권한 요청 함수 / priming dismiss 플래그 함수).
import * as permissions from '../notifications/permissions';

export default function PrimingScreen() {
  const insets = useSafeAreaInsets();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleAllow = () => {
    if (isRequesting) return;
    setIsRequesting(true);
    permissions
      .requestNotificationPermission()
      .catch((error) => {
        // 프로미스 미삼킴 규약(src/app/index.tsx와 동일) — 승인/거부 결과와
        // 무관하게 홈으로 진행하지만, 에러는 로그로 남긴다.
        console.error('Failed to request notification permission', error);
      })
      .finally(() => {
        router.replace('/');
      });
  };

  const handleLater = () => {
    permissions.markPrimingDismissed();
    router.replace('/');
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xl },
      ]}
    >
      <Text style={[typography.screenTitle, styles.heading]}>
        매시간 알림으로 지금 어디 있는지 잠깐 기록해요
      </Text>
      <View style={styles.gapMd} />
      <Pressable
        onPress={handleAllow}
        disabled={isRequesting}
        accessibilityRole="button"
        accessibilityLabel="알림 허용하기"
        style={styles.primaryButton}
      >
        <Text style={[typography.placeName, styles.primaryButtonLabel]}>알림 허용하기</Text>
      </Pressable>
      <View style={styles.gapLg} />
      <Pressable
        onPress={handleLater}
        accessibilityRole="button"
        accessibilityLabel="나중에"
        style={styles.secondaryLink}
      >
        <Text style={[typography.placeName, styles.secondaryLinkLabel]}>나중에</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  heading: {
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  gapMd: {
    height: spacing.md,
  },
  gapLg: {
    height: spacing.lg,
  },
  primaryButton: {
    minHeight: 44,
    marginHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.full,
    backgroundColor: colors.textPrimary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonLabel: {
    color: colors.surface,
    textAlign: 'center',
  },
  secondaryLink: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryLinkLabel: {
    color: colors.textMuted,
  },
});
