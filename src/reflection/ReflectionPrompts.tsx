// src/reflection/ReflectionPrompts.tsx
// 07-04-PLAN.md Task 2 — 회고 모달(07-05)과 과거 날짜 뷰 인라인 편집(07-06)이 공유할
// 프롬프트 2칸 + 저장 실패 UI 프레젠테이셔널 컴포넌트. DB 접근, 화면 전환, 화면 생명주기
// 이벤트 구독, 타이머를 이 파일에서 전혀 다루지 않는다 — 상태와 콜백만 받는다
// (CheckinListRow.tsx/TodayBottomSheet.tsx가 세운 "화면별 로직/배치 없음" 계약).
import { StyleSheet, Text, TextInput, Pressable, View } from 'react-native';
import { REFLECTION_COPY } from './content';
import { colors, radius, spacing, typography } from '../theme/tokens';

// 07-UI-SPEC.md §Spacing Exceptions — 프롬프트1(짧은 답변)/프롬프트2(자유 회고) 입력칸
// 최소 높이. 숫자 리터럴을 스타일에 직접 박지 않고 이 상수를 참조한다.
const PROMPT_SHORT_MIN_HEIGHT = 44;
const PROMPT_LONG_MIN_HEIGHT = 120;

export type ReflectionPromptsProps = {
  newPlaceAnswer: string;
  freeReflection: string;
  onChangeNewPlaceAnswer: (value: string) => void;
  onChangeFreeReflection: (value: string) => void;
  saveFailed: boolean;
  onRetry: () => void;
};

// RN TextInput은 placeholder와 입력값에 서로 다른 fontFamily를 줄 수 없다(style prop이
// 둘 다에 적용됨) — "라벨은 System, 답변은 세리프"를 동시에 만족시킬 수 없어, 항상
// 보이는 캡션 라벨(위 label 스타일)이 placeholder 역할을 대신한다(07-UI-SPEC.md
// §Typography가 확정한 해법). 아래 두 TextInput의 placeholder는 빈 문자열로 고정한다.
export function ReflectionPrompts({
  newPlaceAnswer,
  freeReflection,
  onChangeNewPlaceAnswer,
  onChangeFreeReflection,
  saveFailed,
  onRetry,
}: ReflectionPromptsProps) {
  return (
    <View>
      <View>
        <Text style={styles.label}>{REFLECTION_COPY.promptNewPlace}</Text>
        <TextInput
          style={[typography.journalEntry, styles.promptShortInput]}
          value={newPlaceAnswer}
          onChangeText={onChangeNewPlaceAnswer}
          placeholder=""
          multiline
        />
      </View>
      <View style={styles.secondPromptContainer}>
        <Text style={styles.label}>{REFLECTION_COPY.promptFreeReflection}</Text>
        <TextInput
          style={[typography.journalEntry, styles.promptLongInput]}
          value={freeReflection}
          onChangeText={onChangeFreeReflection}
          placeholder=""
          multiline
        />
      </View>
      {saveFailed ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{REFLECTION_COPY.saveFailed}</Text>
          <Pressable onPress={onRetry} accessibilityRole="button">
            <Text style={styles.retryText}>{REFLECTION_COPY.retryCta}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.helperText,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  // 입력칸 시각 처리는 CheckinDetailScreen.styles.noteInput을 그대로 맞춘다 — 새 색/새
  // radius를 발명하지 않는다.
  promptShortInput: {
    minHeight: PROMPT_SHORT_MIN_HEIGHT,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  // 프롬프트1과 프롬프트2 사이 간격 spacing.xl(32) — 두 질문을 시각적으로 분리한다.
  secondPromptContainer: {
    marginTop: spacing.xl,
  },
  promptLongInput: {
    minHeight: PROMPT_LONG_MIN_HEIGHT,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  // SettingsScreen.tsx errorContainer/errorText/retryText와 동일 처리(muted 색 + 밑줄) —
  // CheckinActionCard의 굵은 pill 버튼 처리를 쓰지 않는다. 빨간색·경고 아이콘·semantic
  // 색상을 쓰지 않는다.
  errorContainer: {
    marginTop: spacing.lg,
    paddingHorizontal: 0,
    gap: spacing.xs,
  },
  errorText: {
    ...typography.helperText,
    color: colors.textMuted,
  },
  retryText: {
    ...typography.helperText,
    color: colors.textMuted,
    textDecorationLine: 'underline',
  },
});
