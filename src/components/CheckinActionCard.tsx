// src/components/CheckinActionCard.tsx
// 03-08-PLAN.md Task 2/3 — 체크인 확인/저장 상태 액션 카드 + 메모/사진 입력 영역.
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
// 메모/사진 입력 영역(Task 3): phase === 'SAVED' 분기 안에서만 마운트된다 — 이는
// checkinFlow.ts의 canEditNoteAndPhoto(state)가 true를 반환하는 유일한 phase와
// 정확히 일치한다(단일 판정 지점). disabled/pointerEvents로 비활성화하는 방식은
// 금지된다 — SAVE_FAILED 등 다른 phase에서는 이 JSX 서브트리 자체가 렌더 트리에
// 존재하지 않아야 한다(03-UI-SPEC.md: "비활성화가 아니라 미마운트").
//
// journalEntry 타이포 토큰(Newsreader 이탤릭 세리프, 사용자 작성 텍스트 전용)은
// 아래 메모 TextInput 하나에만 적용한다 — UI 크롬(버튼 라벨/헤드라인/안내 문구)에는
// 절대 쓰지 않는다(03-UI-SPEC.md §Typography 금지 사항).
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
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

export function CheckinActionCard({
  phase,
  onConfirm,
  onRetry,
  photo,
  photoError,
  note,
  onPickPhoto,
  onChangeNote,
}: CheckinActionCardProps) {
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
          <View style={styles.gapMd} />
          <Pressable
            onPress={onPickPhoto}
            accessibilityRole="button"
            accessibilityLabel={photo ? '사진 변경' : CHECKIN_COPY.photoPlaceholderLabel}
            style={styles.photoBox}
          >
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoThumbnail} />
            ) : (
              <>
                <SymbolView name="camera" tintColor={colors.textMuted} />
                <Text style={[typography.helperText, styles.helperMuted]}>
                  {CHECKIN_COPY.photoPlaceholderLabel}
                </Text>
              </>
            )}
          </Pressable>
          {photo && (
            <Text style={[typography.placeName, styles.photoChangeLabel]}>변경</Text>
          )}
          {photoError && (
            <Text style={[typography.helperText, styles.helperMuted]}>
              {CHECKIN_COPY.photoFailed}
            </Text>
          )}
          <View style={styles.gapMd} />
          <TextInput
            multiline
            value={note}
            onChangeText={onChangeNote}
            placeholder={CHECKIN_COPY.notePlaceholder}
            placeholderTextColor={colors.textFaint}
            style={[typography.journalEntry, styles.noteInput]}
          />
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
  photoBox: {
    width: 80,
    height: 80,
    minHeight: 44,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
  },
  photoChangeLabel: {
    color: colors.textMuted,
  },
  noteInput: {
    minHeight: 68,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
  },
});
