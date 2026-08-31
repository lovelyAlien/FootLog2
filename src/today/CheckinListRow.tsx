// src/today/CheckinListRow.tsx
// 04-04-PLAN.md Task 2 — 바텀시트 리스트의 개별 체크인 행.
//
// 재사용 가능한 독립 컴포넌트 계약(NotificationDeniedBanner.tsx와 동일): 이 컴포넌트는
// 화면별 로직이나 위치 지정(absolute positioning)을 내부에 갖지 않는다 — 배치는 항상
// 부모(TodayBottomSheet → BottomSheetFlatList)가 결정한다.
//
// D-01: 장소명(typography.placeName)을 렌더링하지 않는다 — 오프라인 원칙과 충돌하는
// 리버스 지오코딩이 필요해 이번 phase에서 아예 만들지 않기로 결정된 필드다.
// D-02: 시간(모노스페이스) + 메모 미리보기(세리프 이탤릭, 있을 때만 1줄)로만 구성한다.
// 사진 유무를 나타내는 아이콘/뱃지는 만들지 않는다.
// D-03: 이 행은 탭 불가능하다 — Pressable/TouchableOpacity로 감싸지 않고 순수 View를
// 쓰며, chevron/화살표/">" 문자/밑줄 등 탭 가능함을 암시하는 어떤 시각 요소도 넣지 않는다.
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import { formatLocalTime } from '../checkin/localDate';
import type { CheckinRow } from '../db/schema';

// 리스트 행 최소 높이 — TodayBottomSheet가 CLOSED 피크 높이 계산에 그대로 재사용하므로
// 숫자를 시트 쪽에 중복 선언하지 않는다. 이 44는 44×44pt 터치 타겟 규칙이 아니라
// 리스트 밀도 일관성 근거다(행은 비인터랙티브 — D-03, 04-UI-SPEC.md §Spacing Scale
// Exceptions: "다만 가독성과 기존 리듬 유지를 위해 행 최소 높이는 44px로 맞춘다").
export const LIST_ROW_MIN_HEIGHT = 44;

export type CheckinListRowProps = { checkin: CheckinRow };

// typography.timestamp.fontVariant는 tokens.ts에서 `as const`로 고정된 readonly
// 튜플이라 RN의 TextStyle(mutable FontVariant[] 기대)에 그대로 못 넣는다 — tokens.ts의
// `as const` 계약은 그대로 유지하면서, 소비 측에서만 얕은 복사로 mutable 배열을
// 만들어 타입을 브리징한다(01-04-PLAN.md에서 index.tsx가 쓴 것과 동일한 방식,
// `as` 캐스트로 우회하지 않는다).
const timestampStyle = {
  ...typography.timestamp,
  fontVariant: [...typography.timestamp.fontVariant],
};

export function CheckinListRow({ checkin }: CheckinListRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[timestampStyle, styles.time]}>
        {formatLocalTime(checkin.timestamp_utc)}
      </Text>
      {checkin.note ? (
        <Text
          style={[typography.journalEntry, styles.notePreview]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {checkin.note}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: LIST_ROW_MIN_HEIGHT,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
  },
  time: {
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  notePreview: {
    flexShrink: 1,
    color: colors.textPrimary,
  },
});
