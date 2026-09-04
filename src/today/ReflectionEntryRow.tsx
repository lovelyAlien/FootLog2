// src/today/ReflectionEntryRow.tsx
// 07-09-PLAN.md Task 1 — 오늘 뷰 바텀시트 리스트 최상단 "오늘 돌아보기" 진입 행.
//
// 재사용 가능한 독립 컴포넌트 계약(CheckinListRow.tsx와 동일): 네비게이션을 내부에
// 갖지 않는다 — 라우팅 라이브러리는 이 파일에서 import하지 않고 onPress 콜백만
// 받는다. 배치도 항상 부모(TodayBottomSheet의 리스트 헤더 슬롯)가 결정한다.
//
// D-02(07-CONTEXT.md) — 이 컴포넌트는 그날 회고를 이미 작성했는지 여부를 조회하지도,
// props로 받지도 않는다. 완료 상태를 신호하는 어떤 필드도 두지 않는다(완료 여부/
// 회고 존재 여부/처리 여부를 뜻하는 식별자 전부 부재). 아래 배경색은 "이 행은 체크인
// 행과 종류가 다르다"는 **고정** 스타일일 뿐 상태 신호가 아니다 — PROJECT.md의
// "진행률/완료 수치 UI 노출 금지" CRITICAL 원칙은 숫자뿐 아니라 "완료 여부"를
// 신호하는 모든 시각 장치(체크마크/뱃지/색상 변화)에 동일하게 적용된다. 배경은
// 반드시 옅은 보조 색(soft 계열)만 쓴다 — 진한 본체 색은 07-UI-SPEC.md §Color 기준
// 캘린더 탭 전용 승인 용도이므로 여기서 쓰지 않는다.
//
// 화살표 등 탭 가능함을 암시하는 시각 요소도 두지 않는다 —
// CheckinListRow.tsx가 이미 세운 선례(탭 가능함은 iOS 리스트 관례로 암묵적)와 동일.
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import { LIST_ROW_MIN_HEIGHT } from './CheckinListRow';
import { REFLECTION_COPY } from '../reflection/content';

export type ReflectionEntryRowProps = {
  onPress: () => void;
};

export function ReflectionEntryRow({ onPress }: ReflectionEntryRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={REFLECTION_COPY.todayEntryRow}
      style={styles.row}
    >
      <Text style={styles.label}>{REFLECTION_COPY.todayEntryRow}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: LIST_ROW_MIN_HEIGHT,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  label: {
    ...typography.placeName,
    color: colors.textPrimary,
  },
});
