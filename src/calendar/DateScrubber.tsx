// src/calendar/DateScrubber.tsx
// 06-07-PLAN.md Task 1 — 플로팅 가로 날짜 스크러버: 제스처 · 눈금 · 고정 인디케이터.
//
// docs/designs/calendar-date-scrubber.md(CLEARED)가 확정한 계약을 그대로 구현한다.
// 재사용 가능한 독립 컴포넌트 계약(TodayBottomSheet.tsx/CheckinListRow.tsx와 동일):
// 이 컴포넌트는 자기 자신을 화면 위 어디에 띄울지(화면 하단 오프셋 등) 결정하지
// 않는다 — 그 배치는 항상 부모(PastDateScreen)가 담당한다. 이 파일은 카드 표면 자체의
// 모양(배경/모서리/그림자)과 내부 레이아웃만 갖는다.
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { CALENDAR_COPY } from './content';
import {
  indexForTranslation,
  SCRUBBER_HEADER_HEIGHT_PT,
  SCRUBBER_TICK_SPACING_PX,
  SCRUBBER_TOUCH_SURFACE_HEIGHT_PT,
} from './scrubberRange';

// docs/designs/calendar-date-scrubber.md Visual Design Decisions — 기록 있는 날 눈금의
// 색은 이 phase에서 유일하게 토큰에 없는 hex 값이다(CLEARED 문서 원문 그대로 전사한
// 것이며 여기서 새로 발명한 색이 아니다).
const RECORDED_TICK_COLOR = '#C7C2B4';

// 중앙 슬롯을 기준으로 좌우에 몇 칸씩 보여줄지 — 06-CONTEXT.md Claude's Discretion
// (원본 문서 Open Questions에 "화면 폭에 맞춰 조정 가능"으로 명시). 7칸씩이면
// SCRUBBER_TICK_SPACING_PX(24px) 기준 전체 폭이 약 360px이라 iPhone 12~15급 폭
// (390pt)에서 좌우 spacing.md 여백을 뺀 카드 안에 들어간다.
const VISIBLE_SLOTS_EACH_SIDE = 7;

const TICK_WIDTH_UNRECORDED = 1;
const TICK_HEIGHT_UNRECORDED = 12;
const TICK_WIDTH_RECORDED = 2;
const TICK_HEIGHT_RECORDED = 18;
const TICK_WIDTH_SELECTED = 3;
const TICK_HEIGHT_SELECTED = 26;
const CENTER_INDICATOR_WIDTH = 2;
const CENTER_INDICATOR_HEIGHT = 30;

export type DateScrubberProps = {
  dateKeys: string[]; // buildScrubberDateKeys 결과(오름차순)
  recordedDateKeys: Set<string>; // 눈금 밀도 표시용
  selectedIndex: number;
  onScrubStart: () => void; // 부모가 시트를 CLOSED로 접는다
  onIndexChange: (index: number) => void;
};

export function DateScrubber({
  dateKeys,
  recordedDateKeys,
  selectedIndex,
  onScrubStart,
  onIndexChange,
}: DateScrubberProps) {
  const length = dateKeys.length;

  // 드래그 시작 시점의 인덱스를 담아 두는 shared value — .onBegin()에서 그 순간의
  // selectedIndex(prop)를 저장하고, .onUpdate()는 이 값과 e.translationX만으로
  // indexForTranslation(scrubberRange.ts)을 호출해 다음 인덱스를 얻는다. 인덱스
  // 계산·클램프를 이 파일에서 다시 구현하지 않는다.
  const dragStartIndex = useSharedValue(selectedIndex);
  // 프레임마다 같은 인덱스를 반복해서 JS 스레드로 올려보내지 않기 위한 마지막 발화값
  // (Task 2가 이 콜백으로 재조회를 트리거하므로 중복 호출을 막는 게 중요하다).
  const lastEmittedIndex = useSharedValue(selectedIndex);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      // 손이 닿는 즉시(이동 전) 시트를 접는다 — docs/designs/calendar-date-scrubber.md
      // T1(CRITICAL). dragStartIndex를 여기서 갱신해야 매 스크럽 시작마다 최신
      // selectedIndex를 기준으로 델타를 계산한다.
      dragStartIndex.value = selectedIndex;
      lastEmittedIndex.value = selectedIndex;
      runOnJS(onScrubStart)();
    })
    .onUpdate((e) => {
      const next = indexForTranslation(
        dragStartIndex.value,
        e.translationX,
        length,
        SCRUBBER_TICK_SPACING_PX
      );
      if (next !== lastEmittedIndex.value) {
        lastEmittedIndex.value = next;
        runOnJS(onIndexChange)(next);
      }
    });
  // 의도적으로 .onEnd()가 없다 — 감쇠/스프링/관성 후처리 없음(Premise 10, 모멘텀
  // 없음). 손을 뗀 자리에서 그대로 멈추고 자동으로 재조정되지 않는다.

  // 항상 2*VISIBLE_SLOTS_EACH_SIDE+1개의 고정 슬롯을 렌더한다 — 경계 근처라 실제
  // 눈금 개수가 비대칭이어도(예: 왼쪽에 3개뿐) 빈 슬롯으로 채워, 선택된 눈금이
  // 항상 정확히 가운데 슬롯에 오게 한다(고정 인디케이터가 항상 중앙에 있고 눈금
  // 쪽이 움직이는 것처럼 보이는 효과를 flex 레이아웃만으로 재현한다 — 좌표 변환
  // 애니메이션이 필요 없다. Premise 10이 관성/스프링을 금지하므로 어차피 프레임
  // 단위 좌표 추적이 아니라 인덱스 단위 재배치로 충분하다).
  const slotOffsets: number[] = [];
  for (let offset = -VISIBLE_SLOTS_EACH_SIDE; offset <= VISIBLE_SLOTS_EACH_SIDE; offset++) {
    slotOffsets.push(offset);
  }

  return (
    // 순수 드래그 제스처라 VoiceOver로 직접 조작하기 어렵다(Premise 12) — 캘린더 탭
    // 월 그리드(날짜 탭 이동)가 VoiceOver 사용자의 대체 경로를 항상 담당하므로,
    // 이 카드 전체는 VoiceOver가 의미 없는 눈금 요소를 하나씩 읽지 않도록
    // accessible={false}로 막는다.
    <View style={styles.card} accessible={false}>
      <View style={styles.header}>
        <GestureDetector gesture={panGesture}>
          <View style={styles.touchSurface}>
            <View style={styles.ticksRow} pointerEvents="none">
              {slotOffsets.map((offset) => {
                const index = selectedIndex + offset;
                const outOfRange = index < 0 || index >= length;
                if (outOfRange) {
                  return <View key={`spacer-${offset}`} style={styles.slot} />;
                }
                const dateKey = dateKeys[index];
                const isSelected = offset === 0;
                const isRecorded = recordedDateKeys.has(dateKey);
                // 눈금 색: 기록 없음 colors.line(얇고 짧음), 기록 있음
                // RECORDED_TICK_COLOR(조금 더 길고 진함), 선택된 날은 accent 토큰
                // (굵고 긴 눈금) — 세 색 모두 배타적이다.
                const tickStyle = isSelected
                  ? styles.tickSelected
                  : isRecorded
                    ? styles.tickRecorded
                    : styles.tickUnrecorded;
                return (
                  <View key={dateKey} style={styles.slot}>
                    <View style={tickStyle} />
                  </View>
                );
              })}
            </View>
            {/* 중앙 고정 인디케이터 — 눈금 쪽이 움직이고 이 선은 항상 화면 같은
                자리에 있다(Premise 9). StyleSheet.absoluteFill은 react-native가
                제공하는 사전 등록 스타일 id일 뿐, 이 파일이 직접 화면 배치용
                절대좌표 스타일을 선언하는 게 아니다 — 부모(PastDateScreen)만 이 카드
                자체의 화면상 위치를 결정한다는 컴포넌트 계약은 그대로 유지된다. */}
            <View
              style={[StyleSheet.absoluteFill, styles.centerIndicatorLayer]}
              pointerEvents="none"
            >
              <View style={styles.centerIndicator} />
            </View>
          </View>
        </GestureDetector>
      </View>
      <Text style={[typography.helperText, styles.caption]}>{CALENDAR_COPY.scrubberCaption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  // 헤더 영역 — docs/designs/calendar-date-scrubber.md Premise 8 "헤더 높이 44pt"
  // 기준값을 그대로 반영한다(SCRUBBER_HEADER_HEIGHT_PT).
  header: {
    height: SCRUBBER_HEADER_HEIGHT_PT,
    justifyContent: 'center',
  },
  // 개별 눈금에 확장 히트영역을 주지 않는다(06-RESEARCH.md Pitfall 6) — 이 컨테이너
  // 자체의 높이를 SCRUBBER_TOUCH_SURFACE_HEIGHT_PT 이상으로 줘서 드래그 표면
  // 전체를 44pt 이상으로 만든다.
  touchSurface: {
    minHeight: SCRUBBER_TOUCH_SURFACE_HEIGHT_PT,
    justifyContent: 'center',
  },
  ticksRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slot: {
    width: SCRUBBER_TICK_SPACING_PX,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickUnrecorded: {
    width: TICK_WIDTH_UNRECORDED,
    height: TICK_HEIGHT_UNRECORDED,
    backgroundColor: colors.line,
    borderRadius: radius.sm,
  },
  tickRecorded: {
    width: TICK_WIDTH_RECORDED,
    height: TICK_HEIGHT_RECORDED,
    backgroundColor: RECORDED_TICK_COLOR,
    borderRadius: radius.sm,
  },
  // 선택된 날 + 중앙 고정 인디케이터 — accent 토큰 사용처는 이 두 곳뿐이다
  // (accent 예산, DESIGN.md 승인 용도 중 캘린더 탭 몫).
  tickSelected: {
    width: TICK_WIDTH_SELECTED,
    height: TICK_HEIGHT_SELECTED,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  centerIndicatorLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerIndicator: {
    width: CENTER_INDICATOR_WIDTH,
    height: CENTER_INDICATOR_HEIGHT,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
  },
  caption: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing['2xs'],
  },
});
