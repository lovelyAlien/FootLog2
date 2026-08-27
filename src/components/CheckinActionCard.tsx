// src/components/CheckinActionCard.tsx
// 03-08-PLAN.md Task 2 — 체크인 확인/저장 상태 액션 카드.
//
// 재사용 가능한 프레젠테이셔널 컴포넌트 계약(NotificationDeniedBanner.tsx와 동일):
// 이 컴포넌트는 상태 전이 로직을 내부에 두지 않고 props로 받은 `phase`에 따라
// 렌더만 분기한다. 배치(absolute positioning 등)는 항상 부모가 결정한다 — 이 컴포넌트
// 내부에서는 절대 위치를 지정하지 않는다.
//
// 버튼 색상 결정(03-UI-SPEC.md §Color "버튼 색상 결정" 근거 그대로 계승): "확인"/
// "다시 시도" 버튼은 colors.accent를 쓰지 않는다. DESIGN.md는 accent를 정확히 6개
// 승인된 용도로 제한하며 이 두 버튼은 그 목록에 없다 — priming.tsx의 "허용하기"
// 버튼이 이미 같은 선례를 세웠다(accent 미사용, colors.textPrimary 필 버튼 채택).
//
// 메모/사진 입력 props(photo/photoError/note/onPickPhoto/onChangeNote)는 Task 3이
// SAVED 분기 안에서 소비한다 — 이 파일에서 인터페이스만 먼저 확정한다.
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { CHECKIN_COPY } from '../checkin/checkinFlow';
import type { CheckinPhase } from '../checkin/checkinFlow';
import type { PickedPhoto } from '../checkin/photos';

export type CheckinActionCardProps = {
  phase: CheckinPhase;
  onConfirm: () => void;
  onRetry: () => void;
  photo: PickedPhoto | null;
  photoError: boolean;
  note: string;
  onPickPhoto: () => void;
  onChangeNote: (note: string) => void;
};

export function CheckinActionCard({ phase, onConfirm, onRetry }: CheckinActionCardProps) {
  // CAPTURING/IDLE: 카드 없음 — 로딩은 체크인 버튼 자체가 표현한다(03-UI-SPEC.md).
  if (phase === 'CAPTURING' || phase === 'IDLE') {
    return null;
  }

  return (
    <View style={styles.card}>
      {phase === 'CONFIRM' && (
        <>
          <Text style={[typography.helperText, styles.helperMuted]}>{CHECKIN_COPY.pinHint}</Text>
          <View style={styles.gapMd} />
          <Pressable
            onPress={onConfirm}
            accessibilityRole="button"
            accessibilityLabel={CHECKIN_COPY.confirmCta}
            style={styles.primaryButton}
          >
            <Text style={[typography.placeName, styles.primaryButtonLabel]}>
              {CHECKIN_COPY.confirmCta}
            </Text>
          </Pressable>
        </>
      )}

      {phase === 'SAVING' && (
        <View style={styles.savingRow}>
          <ActivityIndicator color={colors.textMuted} />
        </View>
      )}

      {phase === 'SAVED' && (
        <>
          <Text style={[typography.screenTitle, styles.headlinePrimary]}>
            {CHECKIN_COPY.savedHeadline}
          </Text>
          {/* 메모/사진 입력 영역: canEditNoteAndPhoto(phase === 'SAVED')가 true인
              이 분기 안에서만 마운트된다(Task 3에서 실제 JSX 추가). */}
        </>
      )}

      {phase === 'SAVE_FAILED' && (
        <>
          <Text style={[typography.screenTitle, styles.headlinePrimary]}>
            {CHECKIN_COPY.saveFailedHeadline}
          </Text>
          <View style={styles.gapXs} />
          <Text style={[typography.helperText, styles.helperMuted]}>
            {CHECKIN_COPY.saveFailedHelper}
          </Text>
          <View style={styles.gapMd} />
          <Pressable
            onPress={onRetry}
            accessibilityRole="button"
            accessibilityLabel={CHECKIN_COPY.retryCta}
            style={styles.primaryButton}
          >
            <Text style={[typography.placeName, styles.primaryButtonLabel]}>
              {CHECKIN_COPY.retryCta}
            </Text>
          </Pressable>
          {/* 이 SAVE_FAILED 분기에는 메모/사진 JSX가 존재하지 않는다 — 위 SAVED
              분기(phase === 'SAVED')만이 canEditNoteAndPhoto와 동치인 조건이며,
              여기서는 그 조건 자체가 거짓이라 렌더 트리에 서브트리가 없다
              (미마운트, 비활성화 아님). */}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  gapXs: {
    height: spacing.xs,
  },
  gapMd: {
    height: spacing.md,
  },
  savingRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  headlinePrimary: {
    color: colors.textPrimary,
  },
  helperMuted: {
    color: colors.textMuted,
  },
  primaryButton: {
    minHeight: 44,
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
});
