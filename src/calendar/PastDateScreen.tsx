// src/calendar/PastDateScreen.tsx
// 06-05-PLAN.md Task 2 — 과거 날짜 화면: 그날의 지도 핀 + 바텀시트 리스트를 읽기전용으로
// 보여준다. 새 조회 함수/새 시트 컴포넌트를 만들지 않고 Phase 4/5 산출물을 그대로
// 재사용하는 것이 이 파일의 핵심 제약이다(06-RESEARCH.md 명시 anti-pattern 회피).
//
// (tabs)/index/index.tsx(오늘 뷰)의 지도+시트 합성, 지연 삭제 배선, undo 스낵바
// 배선을 그대로 옮겨오되 두 가지가 다르다:
// 차이 1 — 체크인 버튼을 렌더하지 않는다(체크인 캡처 관련 컴포넌트/상태머신 미import).
// 차이 2 — 이 화면에서만 탭바를 숨긴다(06-RESEARCH.md Pitfall 1 — 탭바를 조작하는
// 파일은 이 저장소에서 이 파일 하나뿐이어야 한다).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, router } from 'expo-router';
import MapView, { Marker, Polyline } from 'react-native-maps';
import BottomSheet from '@gorhom/bottom-sheet';
import { useSharedValue } from 'react-native-reanimated';
import { colors, spacing } from '../theme/tokens';
import { TodayBottomSheet } from '../today/TodayBottomSheet';
import { UndoSnackbar } from '../today/UndoSnackbar';
import { DateScrubber } from './DateScrubber';
import { buildTrajectoryCoordinates } from '../today/trajectory';
import { createPendingDeleteController } from '../today/pendingDelete';
import type { PendingDeleteItem } from '../today/pendingDelete';
import {
  deleteCheckin,
  getCheckinDateKeysInRange,
  getCheckinHistorySummary,
  getTodayCheckins,
  runWithSingleRetry,
} from '../checkin/checkinRepo';
import { defaultPhotoStorageDeps } from '../checkin/deps';
import { MAP_REGION_DELTA } from '../checkin/config';
import { resolveLocalDateKey } from '../checkin/localDate';
import { formatDateKeyTitle } from './monthGrid';
import { CALENDAR_COPY } from './content';
import { buildScrubberDateKeys, SCRUBBER_BOTTOM_OFFSET_PT, shouldShowScrubber } from './scrubberRange';
import { useReflectionDraft } from '../reflection/useReflectionDraft';
import { ReflectionPrompts } from '../reflection/ReflectionPrompts';
import type { MigratableDb } from '../db/migrations';
import type { CheckinRow } from '../db/schema';

// 지도 위 저장된 체크인 핀 — (tabs)/index/index.tsx의 pinSaved 스타일과 동일한
// 물방울 모양(구글맵/애플맵 관례 차용, 새 색상 발명 없음).
const TRAJECTORY_STROKE_WIDTH = 2;

export type PastDateScreenProps = {
  db: MigratableDb;
  dateKey: string;
};

export function PastDateScreen({ db, dateKey }: PastDateScreenProps) {
  const navigation = useNavigation();
  const isMountedRef = useRef(true);
  const [checkins, setCheckins] = useState<CheckinRow[]>([]);
  const [containerHeight, setContainerHeight] = useState(0);
  // (tabs)/index/index.tsx의 05-05-PLAN.md 지연 삭제 관용구와 동일 — 대기 중인
  // 삭제 항목을 리스트/지도 핀/궤적선 세 곳에서 함께 숨긴다.
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  // 06-07-PLAN.md Task 2 — 활성 날짜를 화면 상태로 승격한다. 스크러버 드래그로 날짜가
  // 바뀔 때마다 이 상태만 갱신하고, router.setParams로 라우트 파라미터를 되쓰지
  // 않는다 — 파라미터↔상태 양방향 동기화 루프(라우트가 상태를 바꾸고 상태가 다시
  // 라우트를 바꾸는 순환)를 만들지 않기 위함이다. `dateKey` prop이 바뀌면(예: 캘린더
  // 그리드로 돌아가 다른 날짜를 탭한 뒤 이 화면이 새 파라미터로 재사용되는 경우)
  // 아래 useEffect가 다시 동기화한다.
  const [activeDateKey, setActiveDateKey] = useState(dateKey);
  useEffect(() => {
    setActiveDateKey(dateKey);
  }, [dateKey]);

  // 늦게 도착한 조회 응답이 최신 activeDateKey를 덮어쓰지 않도록 하는 가드용 ref —
  // reloadCheckins의 클로저가 호출 시점의 activeDateKey를 캡처하므로, 응답이 돌아온
  // "현재" activeDateKey는 별도 ref로 추적해야 비교할 수 있다.
  const activeDateKeyRef = useRef(activeDateKey);
  useEffect(() => {
    activeDateKeyRef.current = activeDateKey;
  }, [activeDateKey]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 06-07-PLAN.md Task 2 — 스크러버 데이터. 마운트 시 1회 getCheckinHistorySummary를
  // 불러 첫 체크인 날짜/기록 있는 날 수를 얻는다(하루씩 반복 조회하지 않는다).
  const [historySummary, setHistorySummary] = useState<{
    earliestDateKey: string | null;
    distinctDateCount: number;
  }>({ earliestDateKey: null, distinctDateCount: 0 });
  const [recordedDateKeys, setRecordedDateKeys] = useState<Set<string>>(new Set());

  const todayKey = useMemo(() => resolveLocalDateKey(new Date()), []);

  // 마운트 시점뿐 아니라 화면 내 변경(스와이프 삭제) 후, 그리고 상세화면에서
  // 편집/삭제하고 돌아왔을 때도 다시 불러야 한다 — reloadCheckins와 같은 이유
  // (그 시점의 distinctDateCount/recordedDateKeys가 스크러버 표시 여부/눈금에
  // 그대로 반영되므로, 한 번만 불러오면 그 이후 변경이 스크러버에 반영되지 않는다).
  const reloadScrubberData = useCallback(() => {
    getCheckinHistorySummary(db)
      .then((summary) => {
        if (!isMountedRef.current) return;
        setHistorySummary(summary);
        if (!summary.earliestDateKey) {
          setRecordedDateKeys(new Set());
          return;
        }
        // 눈금 밀도 표시용 — 범위 전체를 한 번의 범위 쿼리로 가져온다(하루씩 N번
        // 조회 금지, 06-RESEARCH.md §Don't Hand-Roll과 동일한 원칙).
        return getCheckinDateKeysInRange(db, summary.earliestDateKey, todayKey).then((keys) => {
          if (isMountedRef.current) {
            setRecordedDateKeys(new Set(keys));
          }
        });
      })
      .catch((error) => {
        console.error('Failed to load check-in history summary for scrubber', error);
      });
  }, [db, todayKey]);

  useEffect(() => {
    reloadScrubberData();
  }, [reloadScrubberData]);

  useFocusEffect(
    useCallback(() => {
      reloadScrubberData();
    }, [reloadScrubberData])
  );

  // getTodayCheckins는 이름만 "Today"일 뿐 임의의 localDateKey를 받는다
  // (checkinRepo.ts 헤더 주석이 Phase 6 재사용을 명시) — 날짜별 조회용 새 함수를
  // 별도로 만들지 않는다.
  const reloadCheckins = useCallback(() => {
    // 클로저가 호출 시점의 activeDateKey를 캡처한다 — 응답이 돌아왔을 때 이 값이
    // activeDateKeyRef.current(그 시점의 "현재" 값)와 같은지 비교해, 스크럽 중
    // 이전 날짜의 늦은 응답이 최신 상태를 덮어쓰지 않도록 가드한다(T-06-14 완화 —
    // 06-07-PLAN.md threat_model).
    getTodayCheckins(db, activeDateKey)
      .then((rows) => {
        if (isMountedRef.current && activeDateKey === activeDateKeyRef.current) {
          setCheckins(rows);
        }
      })
      .catch((error) => {
        console.error('Failed to load past-date check-ins', error);
      });
  }, [db, activeDateKey]);

  useEffect(() => {
    reloadCheckins();
  }, [reloadCheckins]);

  // 상세화면에서 메모/사진을 편집하거나 삭제하고 뒤로가기로 돌아왔을 때 이 화면을
  // 갱신하는 경로 ((tabs)/index/index.tsx CR-01과 동일한 이유).
  useFocusEffect(
    useCallback(() => {
      reloadCheckins();
    }, [reloadCheckins])
  );

  const filteredCheckins = useMemo(
    () => checkins.filter((checkin) => !hiddenIds.has(checkin.id)),
    [checkins, hiddenIds]
  );

  // getTodayCheckins가 이미 timestamp_utc 오름차순으로 정렬해 반환하므로 여기서
  // 다시 정렬하지 않는다(D-11 단일 쿼리 계약).
  const trajectoryCoordinates = useMemo(
    () => buildTrajectoryCoordinates(filteredCheckins),
    [filteredCheckins]
  );

  // (tabs)/index/index.tsx commitPendingDelete와 동일한 순서: 단일 재시도 삭제 →
  // 성공 시 사진 파일 정리(non-blocking) + 목록 재조회, 실패 시 hiddenIds에서
  // 제거해 다음 reload에서 행이 자연스럽게 다시 나타나게 한다.
  const commitPendingDelete = useCallback(
    (item: PendingDeleteItem) => {
      const unhide = () => {
        setHiddenIds((prev) => {
          if (!prev.has(item.id)) return prev;
          const next = new Set(prev);
          next.delete(item.id);
          return next;
        });
      };
      runWithSingleRetry(() => deleteCheckin(db, item.id))
        .then((result) => {
          if (!result.ok) {
            console.error('Failed to commit swipe delete after retry', item.id);
            unhide();
            return;
          }
          if (item.photoPath) {
            defaultPhotoStorageDeps.deleteFile(item.photoPath).catch((error) => {
              console.error('Failed to delete photo file for swiped-away checkin', error);
            });
          }
          reloadCheckins();
          reloadScrubberData();
          unhide();
        })
        .catch((error) => {
          console.error('Unexpected error while committing swipe delete', error);
          unhide();
        });
    },
    [db, reloadCheckins, reloadScrubberData]
  );

  const commitPendingDeleteRef = useRef(commitPendingDelete);
  useEffect(() => {
    commitPendingDeleteRef.current = commitPendingDelete;
  }, [commitPendingDelete]);

  const pendingDeleteController = useState(() =>
    createPendingDeleteController({
      onCommit: (item) => commitPendingDeleteRef.current(item),
      onChange: (id) => setPendingId(id),
    })
  )[0];

  // 언마운트 시 대기 중인 삭제를 취소가 아니라 즉시 확정한다 — dispose()는 취소가
  // 아니라 확정이라는 pendingDelete.ts 계약(T-06-10, T-05-13 선례)을 그대로 따른다.
  // 사용자가 "실행취소"를 누르지 않은 채 화면을 떠났다는 이유로 삭제가 조용히
  // 취소되면, 다음 로드에서 지워졌어야 할 행이 부활한다.
  useEffect(() => {
    return () => {
      pendingDeleteController.dispose();
    };
  }, [pendingDeleteController]);

  const handleDeleteRequest = useCallback(
    (checkin: CheckinRow) => {
      setHiddenIds((prev) => new Set(prev).add(checkin.id));
      pendingDeleteController.request({ id: checkin.id, photoPath: checkin.photo_path });
    },
    [pendingDeleteController]
  );

  const handleUndoDelete = useCallback(() => {
    setHiddenIds((prev) => {
      if (pendingId === null || !prev.has(pendingId)) return prev;
      const next = new Set(prev);
      next.delete(pendingId);
      return next;
    });
    pendingDeleteController.undo();
  }, [pendingDeleteController, pendingId]);

  // 행 탭 → 캘린더 스택 전용 체크인 상세 라우트. pathname+params 객체 형태를 써
  // expo-router가 동적 세그먼트를 직접 인코딩하게 한다(T-06-09, T-05-15 선례).
  // 06-07-PLAN.md Task 2 — 라우트 파라미터(dateKey)가 아니라 스크러버로 바뀐
  // activeDateKey를 기준으로 상세화면을 연다(스크럽 중 다른 날짜를 보다가 행을
  // 탭하면 원래 파라미터가 아니라 지금 보고 있는 날짜의 상세로 이동해야 한다).
  const handleRowPress = useCallback(
    (id: string) => {
      router.push({ pathname: '/calendar/[date]/[id]', params: { date: activeDateKey, id } });
    },
    [activeDateKey]
  );

  const handleContainerLayout = useCallback(
    (event: { nativeEvent: { layout: { height: number } } }) => {
      const nextHeight = event.nativeEvent.layout.height;
      setContainerHeight((prev) => (prev === nextHeight ? prev : nextHeight));
    },
    []
  );

  // 시트 상단 y좌표 — 이 화면에 체크인 버튼이 없어 floatingButtonStyle 같은
  // 소비자가 없지만, TodayBottomSheet가 요구하는 animatedPosition 계약을
  // 만족시키기 위해 이 화면이 소유한다(부모 소유 SharedValue 계약).
  const sheetPosition = useSharedValue(0);

  // 06-07-PLAN.md Task 2 — 스크러버가 손에 닿는 즉시 시트를 CLOSED로 강제 접기
  // 위한 imperative ref(T1, CRITICAL). TodayBottomSheet.tsx가 06-07이 추가한
  // 선택적 sheetRef prop을 그대로 전달만 받는다.
  const sheetRef = useRef<BottomSheet>(null);
  const handleScrubStart = useCallback(() => {
    sheetRef.current?.snapToIndex(0);
  }, []);

  // 07-07-PLAN.md Task 1 — 라우트 파라미터 dateKey가 아니라 스크러버로 갱신되는
  // activeDateKey를 넘긴다(handleRowPress와 동일한 이유 — 스크럽 중 보고 있는
  // 날짜의 회고를 편집해야 한다). 날짜 전환 시의 flush/재로드는 useReflectionDraft
  // 내부에서 이미 처리되므로(dateKey가 바뀌는 effect의 cleanup에서 flush) 이
  // 화면이 별도의 flush용 effect나 앱 포그라운드/백그라운드 전환 리스너를 추가하지
  // 않는다 — 추가하면 같은 draft가 훅 내부 경로와 이 화면의 경로 두 곳에서 저장을
  // 시도하게 된다.
  const reflection = useReflectionDraft(db, activeDateKey);

  // 07-07-PLAN.md Task 1 — 시트 푸터는 반드시 useMemo로 만든 엘리먼트를 전달한다.
  // 렌더 함수를 그 자리에서 인라인으로 만들어 넘기면(매 렌더마다 새 함수 참조) 매
  // 렌더마다 새 컴포넌트 *타입*이 생성되어 리스트가 이전 푸터를 언마운트하고 새
  // 푸터를 마운트한다 — 그 안의 입력칸도 함께 재마운트되어 타이핑 중 키보드
  // 포커스가 끊긴다. 엘리먼트(인스턴스)를 넘기면 타입이 안정적으로 유지되어 입력칸
  // 생명주기가 보존된다(T-07-18).
  const reflectionFooter = useMemo(
    () => (
      <View
        style={styles.reflectionSection}
        onTouchStart={() => {
          // 키보드가 프롬프트를 가리지 않도록, 프롬프트 터치 시 시트를 OPEN으로
          // 편다 — 스크러버가 쓰는 동일한 imperative sheetRef 관용구의 반대
          // 방향(스크러버는 접고, 프롬프트 터치는 편다). TodayBottomSheet를
          // 수정하지 않고 이 화면 안에서 해결한다.
          sheetRef.current?.snapToIndex(1);
        }}
      >
        <ReflectionPrompts
          newPlaceAnswer={reflection.newPlaceAnswer}
          freeReflection={reflection.freeReflection}
          onChangeNewPlaceAnswer={reflection.onChangeNewPlaceAnswer}
          onChangeFreeReflection={reflection.onChangeFreeReflection}
          saveFailed={reflection.saveFailed}
          onRetry={reflection.onRetry}
        />
      </View>
    ),
    [
      reflection.newPlaceAnswer,
      reflection.freeReflection,
      reflection.onChangeNewPlaceAnswer,
      reflection.onChangeFreeReflection,
      reflection.saveFailed,
      reflection.onRetry,
    ]
  );

  // 범위는 첫 체크인 날짜 ~ 오늘이며 미래로는 넘어가지 않는다(Premise 5).
  const scrubberDateKeys = useMemo(
    () =>
      historySummary.earliestDateKey
        ? buildScrubberDateKeys(historySummary.earliestDateKey, todayKey)
        : [],
    [historySummary.earliestDateKey, todayKey]
  );

  // activeDateKey가 스크러버 범위 밖(캘린더 그리드에서 미래 날짜를 직접 탭한 경우 —
  // 실제로는 그런 라우트가 생기지 않지만 방어적으로 처리)이면 -1이 되고, 아래 렌더
  // 조건에서 스크러버 자체를 마운트하지 않는다.
  const selectedIndex = scrubberDateKeys.indexOf(activeDateKey);

  const showScrubber =
    shouldShowScrubber(historySummary.distinctDateCount) &&
    scrubberDateKeys.length > 0 &&
    selectedIndex >= 0;

  const handleScrubIndexChange = useCallback(
    (index: number) => {
      const nextDateKey = scrubberDateKeys[index];
      if (nextDateKey) {
        setActiveDateKey(nextDateKey);
      }
    },
    [scrubberDateKeys]
  );

  // 헤더 타이틀 — activeDateKey가 바뀔 때마다(스크럽 포함) 다시 계산한다.
  useEffect(() => {
    navigation.setOptions({ title: formatDateKeyTitle(activeDateKey) });
  }, [navigation, activeDateKey]);

  // 06-RESEARCH.md Pitfall 1 — 탭바를 조작하는 파일은 이 저장소에서 이 파일
  // 하나뿐이어야 한다. useFocusEffect(useLayoutEffect가 아니라)를 쓰는 이유:
  // 이 화면 위로 체크인 상세화면이 push되면 blur가 발생해 탭바가 복원되므로,
  // "과거 날짜 뷰는 탭바 숨김 / 체크인 상세화면은 탭바 유지"라는
  // footlog-product-design.md 네비게이션 계약 두 줄을 이 한 훅으로 동시에
  // 만족한다 — 상세화면으로 push해 blur되면 cleanup이 돌아 탭바가 복원되고,
  // 뒤로 돌아와 focus를 다시 얻으면 effect가 재실행돼 다시 숨긴다.
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      return () => {
        navigation.getParent()?.setOptions({ tabBarStyle: { display: 'flex' } });
      };
    }, [navigation])
  );

  const firstCheckin = checkins[0];
  const initialRegion = firstCheckin
    ? {
        latitude: firstCheckin.lat,
        longitude: firstCheckin.lng,
        latitudeDelta: MAP_REGION_DELTA,
        longitudeDelta: MAP_REGION_DELTA,
      }
    : undefined;

  return (
    <View style={styles.screen} onLayout={handleContainerLayout}>
      {/* 과거 날짜를 보는 화면이라 showsUserLocation을 켜지 않는다 — 현재 위치
          점은 이 화면의 맥락과 무관하다. */}
      <MapView style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
        {trajectoryCoordinates.length >= 2 && (
          <Polyline
            coordinates={trajectoryCoordinates}
            strokeColor={colors.pinSoft}
            strokeWidth={TRAJECTORY_STROKE_WIDTH}
          />
        )}

        {filteredCheckins.map((checkin) => (
          <Marker
            key={checkin.id}
            coordinate={{ latitude: checkin.lat, longitude: checkin.lng }}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View style={styles.pinWrapper}>
              <View style={styles.pinDrop} />
            </View>
          </Marker>
        ))}
      </MapView>

      {/* 체크인 버튼/재센터 버튼을 두지 않는다 — 이 화면은 읽기전용이다. 빈 상태
          문구는 시트 표면에만 렌더한다(지도 위에 절대 겹쳐 그리지 않는다 —
          대비 안전 규칙). */}
      <TodayBottomSheet
        sheetRef={sheetRef}
        checkins={filteredCheckins}
        containerHeight={containerHeight}
        animatedPosition={sheetPosition}
        onRowPress={handleRowPress}
        onDeleteRequest={handleDeleteRequest}
        emptyText={CALENDAR_COPY.pastDateEmptyState}
        ListFooterComponent={reflectionFooter}
      />

      {/* 06-07-PLAN.md Task 2 — 스크러버는 시트보다 위 레이어(JSX상 더 뒤에 렌더돼
          기본 스택 순서상 위에 옴)에 두어 시트 상태(CLOSED/OPEN)와 무관하게 항상
          같은 화면 위치에 뜬다(docs/designs/calendar-date-scrubber.md Premise 8).
          숨김 스타일이 아니라 조건이 false면 트리에서 아예 빼서 미마운트한다
          (Premise 11 — 기록 0~1일이면 훑어볼 게 없다). 이 화면(PastDateScreen)만
          카드의 화면상 위치(절대좌표 bottom 오프셋)를 결정한다 — DateScrubber
          자신은 배치를 갖지 않는 컴포넌트 계약(Task 1)을 그대로 유지한다. */}
      {showScrubber && (
        <View style={styles.scrubberContainer} pointerEvents="box-none">
          <DateScrubber
            dateKeys={scrubberDateKeys}
            recordedDateKeys={recordedDateKeys}
            selectedIndex={selectedIndex}
            onScrubStart={handleScrubStart}
            onIndexChange={handleScrubIndexChange}
          />
        </View>
      )}

      <View style={styles.undoSnackbarContainer} pointerEvents="box-none">
        <UndoSnackbar visible={pendingId !== null} onUndo={handleUndoDelete} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 07-07-PLAN.md Task 1 — 시트 하단 인라인 회고 프롬프트 섹션. 07-UI-SPEC.md
  // §Component Contracts 3 — 회고 모달과 동일한 프롬프트 UI를 그대로 재사용하되
  // "오늘의 흔적" 헤더/썸네일은 없다(D-04). 좌우 spacing.md, 상/하단 spacing.lg.
  reflectionSection: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // (tabs)/index/index.tsx의 undoSnackbarContainer와 동일한 배치(화면 하단, 탭바는
  // 이 View 바깥이라 이미 제외됨).
  undoSnackbarContainer: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    bottom: spacing.lg,
  },
  // 06-07-PLAN.md Task 2 — 스크러버 카드의 화면상 위치. 132 같은 숫자 리터럴을 쓰지
  // 않고 SCRUBBER_BOTTOM_OFFSET_PT(scrubberRange.ts 단일 출처)를 참조한다. 시트보다
  // 위 레이어에 항상 같은 자리로 고정한다(Premise 8).
  scrubberContainer: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: SCRUBBER_BOTTOM_OFFSET_PT,
  },
  // 저장된 체크인 핀 — (tabs)/index/index.tsx의 pinWrapper/pinDrop/pinSaved와
  // 동일한 물방울 모양(구글맵/애플맵 관례 차용). 원본 location_source 구분은
  // 저장 이후 유지하지 않는다(04-UI-SPEC.md §저장된 체크인 핀).
  pinWrapper: {
    width: 28,
    height: 34,
    alignItems: 'center',
  },
  pinDrop: {
    width: 28,
    height: 28,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: '-45deg' }],
    backgroundColor: colors.pinSoft,
  },
});
