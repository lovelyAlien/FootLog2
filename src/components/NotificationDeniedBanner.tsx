// src/components/NotificationDeniedBanner.tsx
// Plan 02-06 — 알림 권한이 거부됐을 때 뜨는 조용한 상태 배너.
//
// 재사용 가능한 독립 컴포넌트 계약: 이 컴포넌트는 화면별 로직이나 위치 지정
// (absolute positioning)을 내부에 갖지 않는다 — 배치는 항상 부모가 결정한다.
// Phase 2 시점에는 src/app/index.tsx(부팅 확인용 임시 화면) 상단에 임시로
// 렌더링되지만, 이것은 최종 위치가 아니다. Phase 4가 오늘 뷰를 빌드할 때
// import 경로만 바꿔 지도 상단(탭바 위, 세이프에어리어 아래)으로 그대로
// 재배치할 수 있어야 한다.
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
// 네임스페이스 import — 정적 계약 테스트가 훅 식별자를 호출부 1곳에서만
// 세도록, import 목록에는 함수명을 나열하지 않는다(priming.tsx와 동일 패턴).
import * as permissions from '../notifications/permissions';

export function NotificationDeniedBanner() {
  const { showBanner, openSettings } = permissions.useNotificationPermissionBanner();

  if (!showBanner) {
    return null;
  }

  return (
    <Pressable
      onPress={openSettings}
      accessibilityRole="button"
      accessibilityLabel="알림이 꺼져있어요. 설정에서 켜기"
      style={styles.banner}
    >
      <Text style={[typography.helperText, styles.text]}>알림이 꺼져있어요 · 설정에서 켜기</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    // 고정 불투명 배경(colors.surface) — 02-RESEARCH.md Pitfall 6: 지도 같은
    // 가변 배경 위에 오버레이로 얹으면 4.5:1 명도 대비를 보장할 수 없다.
    // opacity/rgba를 쓰지 않고 불투명 색을 직접 지정해 이 문제를 원천 차단한다.
    backgroundColor: colors.surface,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    justifyContent: 'center',
  },
  text: {
    color: colors.textMuted,
  },
});
