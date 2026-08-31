// src/today/CheckinListRow.tsx
// 04-04-PLAN.md Task 2 — 바텀시트 리스트의 개별 체크인 행.
//
// 05-05-PLAN.md — Phase 4 D-03(04-CONTEXT.md: 이 행을 순수 View로 두고 어떤 탭
// 인터랙션도 배선하지 않는다는 계약)을 명시적으로 반전한다. 이번 phase에서 상세화면
// 진입점이 새로 생기면서(05-CONTEXT.md/05-UI-SPEC.md), 행을 Pressable로 감싸 탭 시
// onPress(checkin.id)를 부른다. chevron/화살표/">" 등 탭 가능함을 암시하는 시각 요소는
// 05-UI-SPEC.md 확정대로 여전히 추가하지 않는다(스와이프 삭제 어포던스와 시각적으로
// 섞이지 않게, 리스트 밀도 유지) — 이 부분은 Phase 4 결정 그대로 유지된다. D-01(장소명
// 미렌더)/D-02(시간+메모 미리보기만) 계약도 변경 없이 유지한다.
//
// 재사용 가능한 독립 컴포넌트 계약(NotificationDeniedBanner.tsx와 동일): 이 컴포넌트는
// 화면별 로직(네비게이션 자체)을 내부에 갖지 않는다 — expo-router는 여기서 import하지
// 않고 onPress/onDeleteRequest 콜백만 받는다. 배치(absolute positioning)도 항상
// 부모가 결정한다.
//
// 스와이프 삭제(REQ-checkin-swipe-delete) — 왼쪽으로 스와이프하면 오른쪽에서
// colors.pin(테라코타) 배경의 삭제 어포던스가 나온다. accent가 아니다 — DESIGN.md
// 2026-08-31 갱신이 accent 승인 용도를 캘린더 탭 전용 2개로 좁히고 체크인 관련 색상을
// 전부 Pin으로 이전했다(2026-09-01 Decisions Log가 이 어포던스를 Pin으로 확정). 구
// Swipeable(class, deprecated) 대신 ReanimatedSwipeable을 쓴다.
//
// 부모 BottomSheetFlatList의 세로 팬 제스처와 경합할 수 있다는 커뮤니티 보고
// (05-RESEARCH.md Pitfall 3, MEDIUM confidence) 완화 — 05-RESEARCH.md/05-05-PLAN.md는
// activeOffsetX/failOffsetY prop을 직접 명시하는 예시를 들었지만, 실제 설치된
// ReanimatedSwipeable(react-native-gesture-handler@2.32.0, node_modules 소스 직접
// 확인)의 SwipeableProps에는 그 두 prop이 존재하지 않는다 — 내부적으로
// dragOffsetFromLeftEdge/dragOffsetFromRightEdge(기본값 10)를 그대로
// `.activeOffsetX([-dragOffsetFromRightEdge, dragOffsetFromLeftEdge])`로 변환해
// PanGesture에 적용한다(ReanimatedSwipeable.tsx 502~506줄). 즉 가로 10px 이상
// 이동해야 활성화된다는 동일한 완화 효과를 이 두 실존 prop으로 얻을 수 있어 그대로
// 명시한다. failOffsetY(세로 이동 우선 감지 시 제스처 포기)에 대응하는 public prop은
// 이 컴포넌트 버전에 존재하지 않는다 — 실기기/시뮬레이터 검증은 05-07-PLAN.md 몫으로
// 남긴다(05-RESEARCH.md도 Pitfall 3를 MEDIUM confidence로만 표시했다).
//
// 스와이프가 임계값을 넘으면 별도 확인 다이얼로그 없이 곧장 onDeleteRequest를
// 부른다(iOS 네이티브 스와이프 삭제 관례) — 실제 DB 삭제는 이 컴포넌트가 아니라
// 부모의 지연 삭제 컨트롤러가 4초 뒤에 확정한다(pendingDelete.ts).
import ReanimatedSwipeable, {
  SwipeDirection,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { colors, spacing, typography } from '../theme/tokens';
import { formatLocalTime } from '../checkin/localDate';
import { TODAY_COPY } from './content';
import type { CheckinRow } from '../db/schema';

// 리스트 행 최소 높이 — TodayBottomSheet가 CLOSED 피크 높이 계산에 그대로 재사용하므로
// 숫자를 시트 쪽에 중복 선언하지 않는다.
export const LIST_ROW_MIN_HEIGHT = 44;

// 스와이프 삭제 어포던스 폭 — 05-UI-SPEC.md §Spacing Scale Exceptions 확정값(리스트
// 행과 동일한 44px 높이).
const DELETE_AFFORDANCE_WIDTH = 72;

// 가로 10px 이상 이동해야 스와이프 제스처가 활성화된다 — dragOffsetFromLeftEdge/
// dragOffsetFromRightEdge에 그대로 전달돼 내부적으로 PanGesture의 activeOffsetX와
// 동일한 효과를 낸다(위 헤더 주석 참고).
const SWIPE_ACTIVATION_OFFSET_PX = 10;

export type CheckinListRowProps = {
  checkin: CheckinRow;
  onPress: (id: string) => void;
  onDeleteRequest: (checkin: CheckinRow) => void;
};

// typography.timestamp.fontVariant는 tokens.ts에서 `as const`로 고정된 readonly
// 튜플이라 RN의 TextStyle(mutable FontVariant[] 기대)에 그대로 못 넣는다 — tokens.ts의
// `as const` 계약은 그대로 유지하면서, 소비 측에서만 얕은 복사로 mutable 배열을
// 만들어 타입을 브리징한다(01-04-PLAN.md에서 index.tsx가 쓴 것과 동일한 방식,
// `as` 캐스트로 우회하지 않는다).
const timestampStyle = {
  ...typography.timestamp,
  fontVariant: [...typography.timestamp.fontVariant],
};

export function CheckinListRow({ checkin, onPress, onDeleteRequest }: CheckinListRowProps) {
  const time = formatLocalTime(checkin.timestamp_utc);
  const accessibilityLabel = checkin.note ? `${time}, ${checkin.note}` : time;

  return (
    <ReanimatedSwipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      dragOffsetFromLeftEdge={SWIPE_ACTIVATION_OFFSET_PX}
      dragOffsetFromRightEdge={SWIPE_ACTIVATION_OFFSET_PX}
      renderRightActions={() => (
        <View
          style={styles.deleteAffordance}
          accessible
          accessibilityLabel={TODAY_COPY.deleteAffordanceLabel}
        >
          <SymbolView name="trash" tintColor={colors.surface} />
        </View>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === SwipeDirection.RIGHT) {
          onDeleteRequest(checkin);
        }
      }}
    >
      <Pressable
        onPress={() => onPress(checkin.id)}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      >
        <Text style={[timestampStyle, styles.time]}>{time}</Text>
        {checkin.note ? (
          <Text
            style={[typography.journalEntry, styles.notePreview]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {checkin.note}
          </Text>
        ) : null}
      </Pressable>
    </ReanimatedSwipeable>
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
    backgroundColor: colors.surface,
  },
  // iOS 표준 하이라이트 수준만 준다 — 새 리플/그림자 효과를 발명하지 않는다.
  rowPressed: {
    backgroundColor: colors.surfaceSoft,
  },
  time: {
    color: colors.textPrimary,
    marginRight: spacing.xs,
  },
  notePreview: {
    flexShrink: 1,
    color: colors.textPrimary,
  },
  deleteAffordance: {
    width: DELETE_AFFORDANCE_WIDTH,
    backgroundColor: colors.pin,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
