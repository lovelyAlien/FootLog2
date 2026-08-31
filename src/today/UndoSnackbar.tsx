// src/today/UndoSnackbar.tsx
// 05-05-PLAN.md Task 1 — 스와이프 삭제 4초 undo 스낵바.
//
// 재사용 가능한 독립 컴포넌트 계약(CheckinActionCard.tsx/LocationDeniedBanner.tsx와
// 동일): 이 컴포넌트는 위치 지정(absolute positioning)을 내부에 두지 않는다 —
// 배치(화면 하단, 탭바 위)는 항상 부모(오늘 화면)가 결정한다. visible이 거짓이면
// disable이 아니라 미마운트(null)한다 — 이 저장소의 "비활성화가 아니라 미마운트"
// 계약(CheckinActionCard.tsx SAVE_FAILED 절과 동일 원칙).
import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text } from 'react-native';
import { colors, motion, radius, spacing, typography } from '../theme/tokens';
import { TODAY_COPY } from './content';

export type UndoSnackbarProps = {
  visible: boolean;
  onUndo: () => void;
};

export function UndoSnackbar({ visible, onUndo }: UndoSnackbarProps) {
  // 등장 크로스페이드 — 기존 저장 상태 전환 모션 토큰(180ms)을 재사용한다(새 모션
  // 토큰을 발명하지 않는다). 마운트될 때마다 0에서 1로 페이드인한다 — 부모가
  // visible을 false로 바꾸는 즉시 이 컴포넌트 자체가 미마운트되므로 별도의 퇴장
  // 페이드를 걸 대상이 없다.
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    opacity.setValue(0);
    const crossfade = Animated.timing(opacity, {
      toValue: 1,
      duration: motion.saveStateCrossfadeMs,
      useNativeDriver: true,
    });
    crossfade.start();
    return () => {
      crossfade.stop();
    };
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.snackbar, { opacity }]}>
      <Text style={[typography.placeName, styles.label]}>{TODAY_COPY.deletedSnackbar}</Text>
      <Pressable
        onPress={onUndo}
        accessibilityRole="button"
        accessibilityLabel={TODAY_COPY.undoCta}
        style={styles.undoButton}
      >
        <Text style={[typography.placeName, styles.undoLabel]}>{TODAY_COPY.undoCta}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.textPrimary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  label: {
    color: colors.surface,
  },
  undoButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  undoLabel: {
    color: colors.surface,
    textDecorationLine: 'underline',
  },
});
