// src/checkin/CheckinDetailScreen.tsx
// 05-03-PLAN.md Task 2 — 체크인 상세화면 본체(표시 계층).
//
// 이 화면이 src/app/의 라우트 파일이 아니라 src/checkin/ 아래에 있는 이유: Phase 6
// (캘린더 과거 날짜 뷰)이 (tabs)/calendar/...라는 다른 탭의 다른 nested stack에서
// 진입하므로 같은 라우트 파일을 그대로 push할 수 없고, 반드시 별도 라우트 파일에서
// 같은 화면 컴포넌트를 import해야 한다 — 화면 본체가 라우트 파일 안에 있으면 Phase 6이
// 전체를 복제하게 된다(05-RESEARCH.md §Recommended Project Structure).
//
// 재사용 가능한 프레젠테이셔널 컴포넌트 계약(CheckinActionCard.tsx와 동일): 배치
// (position: 'absolute' 등)는 항상 부모(라우트 파일 → Stack.Screen)가 결정한다 — 이
// 컴포넌트 내부에서는 절대 위치를 쓰지 않는다.
//
// 이 plan(05-03)은 표시 계층(시각 → 정적 지도 미리보기 → 사진, 고정 순서)까지만
// 책임진다. 메모 입력·저장·미저장 경고·AppState background flush·"지도 앱에서 열기"
// 딥링크는 05-04-PLAN.md가, 사진 교체/삭제 인터랙션은 05-06-PLAN.md가 이 파일에
// 이어서 추가한다 — 지금은 그 슬롯에 동작 없는 껍데기도 렌더하지 않는다.
//
// D-05: 이 화면에 체크인 전체 삭제 진입점을 두지 않는다 — 삭제는 오늘 뷰 리스트
// 스와이프로만 제공되며(05-05-PLAN.md), 상세화면은 편집 전용 공간으로 유지한다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { formatLocalTime, formatLocalMonthDay, toIsoTimestamp } from './localDate';
import { CHECKIN_COPY } from './checkinFlow';
import { MAP_REGION_DELTA } from './config';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from 'expo-router';
import { getCheckinById, runWithSingleRetry, updateCheckinNoteAndPhoto } from './checkinRepo';
import { colors, radius, spacing, typography } from '../theme/tokens';
import type { MigratableDb } from '../db/migrations';
import type { CheckinRow } from '../db/schema';

export type CheckinDetailScreenProps = {
  db: MigratableDb;
  checkinId: string;
};

// typography.timestamp.fontVariant readonly 튜플 브리징 — src/today/CheckinListRow.tsx의
// 얕은 복사 관용구를 그대로 복제한다(`as` 캐스트로 우회하지 않는다).
const timestampStyle = {
  ...typography.timestamp,
  fontVariant: [...typography.timestamp.fontVariant],
};

export function CheckinDetailScreen({ db, checkinId }: CheckinDetailScreenProps) {
  const navigation = useNavigation();
  const [checkin, setCheckin] = useState<CheckinRow | null>(null);
  // 언마운트 후 setState를 막는 가드 — (tabs)/index/index.tsx의 handlePickPhoto가
  // 이미 쓰는 관용구와 동일.
  const isMountedRef = useRef(true);

  // 05-04-PLAN.md Task 1 — 메모 편집 상태(D-01: 자동저장 아님, 명시적 flush만).
  // noteRef/photoPathRef는 최신 값을 리스너(Task 2의 AppState 구독, Task 3의
  // beforeRemove 구독)가 재구독 없이 읽게 하는 ref 미러 관용구
  // ((tabs)/index/index.tsx의 stateRef와 동일한 이유) — flushNoteAndPhoto를
  // [db, checkinId]에만 의존하는 안정적 useCallback으로 유지하기 위함이다.
  const [note, setNote] = useState('');
  const noteRef = useRef('');
  // 사진 편집(교체/삭제)은 05-06-PLAN.md 몫이라 이 plan에서는 photo_path가 로드 이후
  // 바뀌지 않는다 — 그래도 flushNoteAndPhoto가 checkin state를 deps에 담지 않도록
  // ref로 미러링해둔다.
  const photoPathRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    getCheckinById(db, checkinId).then((row) => {
      if (!isMountedRef.current) return;
      setCheckin(row);
      const initialNote = row?.note ?? '';
      setNote(initialNote);
      noteRef.current = initialNote;
      photoPathRef.current = row?.photo_path ?? null;
    });
  }, [db, checkinId]);

  useEffect(() => {
    if (!checkin) return;
    navigation.setOptions({ title: formatLocalMonthDay(checkin.timestamp_utc) });
  }, [checkin, navigation]);

  // flushNoteAndPhoto — 메모 저장의 유일한 실행 지점. 인앱 이탈 경고(Task 3)의
  // "저장하고 나가기", AppState background 전환(Task 2, D-02), "지도 앱에서 열기"
  // 딥링크(Task 2) 선행 flush, 그리고 아래 저장 실패 UI의 "다시 시도"가 전부 같은
  // 함수를 서로 다른 트리거로 호출한다 — checkinRepo.ts 주석이 명시한 대로
  // runWithSingleRetry(단일 재시도)를 그대로 재사용한다. deps를 [db, checkinId]로만
  // 고정해 매 키 입력마다 이 함수가 재생성되지 않게 한다(Task 2의 AppState 리스너가
  // 이 함수를 deps로 구독하기 때문).
  const flushNoteAndPhoto = useCallback(async () => {
    const result = await runWithSingleRetry(() =>
      updateCheckinNoteAndPhoto(db, checkinId, {
        note: noteRef.current || null,
        photoPath: photoPathRef.current,
        now: toIsoTimestamp(),
      })
    );
    if (result.ok) {
      isDirtyRef.current = false;
      setSaveFailed(false);
    } else {
      // 아직 저장되지 않았다 — dirty를 내리지 않는다.
      setSaveFailed(true);
    }
  }, [db, checkinId]);

  function handleChangeNote(next: string) {
    setNote(next);
    noteRef.current = next;
    isDirtyRef.current = true;
  }
  // 텍스트필드 blur(포커스만 이탈) 시점에 반응하는 핸들러는 의도적으로 붙이지 않는다
  // — blur는 아무 것도 저장하지 않고 dirty 상태만 유지한다(05-UI-SPEC.md §저장 트리거
  // 매트릭스, D-01). Phase 3 캡처 시점의 "blur 즉시 커밋"(CheckinActionCard의 블러
  // 콜백)과 의도적으로 다른 모델이며, 이 화면의 핵심 결정이라 "일관성" 명목으로 blur
  // 저장을 되돌리기 가장 쉬운 지점이다 — 되돌리지 말 것.

  // 로드 전(state 초기값) + 존재하지 않는 id(getCheckinById가 null 반환) 둘 다 같은
  // 빈 렌더로 처리한다 — 이 화면은 "이미 존재하는 체크인 1건"에 대한 화면이라 빈
  // 상태 개념이 없다(05-UI-SPEC.md §Copywriting Contract "Empty state: 해당 없음").
  if (!checkin) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={[timestampStyle, styles.time]}>{formatLocalTime(checkin.timestamp_utc)}</Text>

      {/* 정적 지도 미리보기 — 스크롤/줌/회전/틸트/탭 모두 비활성. 터치 이벤트 자체를
          완전히 무시하는 속성까지 더해 개별 제스처 플래그를 다 잠가도 남을 수 있는
          제스처 인식을 원천 차단한다(05-UI-SPEC.md §정적 지도 미리보기, 05-RESEARCH.md
          Pattern 2). */}
      <MapView
        style={styles.map}
        region={{
          latitude: checkin.lat,
          longitude: checkin.lng,
          latitudeDelta: MAP_REGION_DELTA,
          longitudeDelta: MAP_REGION_DELTA,
        }}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        pointerEvents="none"
      >
        {/* 마커 색은 반드시 "저장된 핀" 토큰(pinSaved 스타일)이어야 한다 — 이 화면이
            보여주는 체크인은 항상 이미 저장이 끝난 과거 기록이라 오늘 뷰의 "저장된 핀"
            규칙과 같아야 한다("진행 중 확인 핀" 토큰은 이 화면에 등장하지 않는다).
            teardrop 기하는 (tabs)/index/index.tsx의 pinWrapper/pinDrop/pinSaved를
            그대로 복제한다(재도출하지 않는다). */}
        <Marker
          coordinate={{ latitude: checkin.lat, longitude: checkin.lng }}
          anchor={{ x: 0.5, y: 1 }}
        >
          <View style={styles.pinWrapper}>
            <View style={[styles.pinDrop, styles.pinSaved]} />
          </View>
        </Marker>
      </MapView>

      {/* "지도 앱에서 열기" 버튼(레이아웃 3번 슬롯, 지도와 사진 사이)은 05-04-PLAN.md
          Task 2가 이 지점에 이어 붙인다 — 이 커밋은 아직 그 버튼을 렌더하지 않는다. */}

      {checkin.photo_path ? (
        <Image source={{ uri: checkin.photo_path }} style={styles.photo} contentFit="contain" />
      ) : (
        <View style={styles.photoEmpty}>
          <SymbolView name="camera" tintColor={colors.textMuted} />
          <Text style={[typography.helperText, styles.photoEmptyLabel]}>
            {CHECKIN_COPY.photoPlaceholderLabel}
          </Text>
        </View>
      )}
      {/* 사진 교체/제거 인터랙션(D-03/D-04, 기존 첨부를 없애는 가벼운 편집 액션)은
          05-06-PLAN.md가 추가한다 — 여기서는 표시 전용이라 Pressable로 감싸지 않는다
          (중복 구현 방지 주석). */}

      {/* 5. 메모(레이아웃 마지막 슬롯) — journalEntry 타이포 토큰은 이 TextInput
          하나에만 적용한다(Phase 3/4 계승 원칙, 버튼/헤더/안내 문구에는 절대 쓰지
          않는다). 자동저장 없음 — dirty 상태만 로컬로 추적하고, 저장은 아래 세 지점
          (인앱 이탈 경고의 "저장하고 나가기", AppState background flush, 지도 앱 열기
          선행 flush)에서만 명시적으로 실행된다(D-01). */}
      <TextInput
        multiline
        value={note}
        onChangeText={handleChangeNote}
        placeholder={CHECKIN_COPY.notePlaceholder}
        placeholderTextColor={colors.textFaint}
        style={[typography.journalEntry, styles.noteInput]}
      />

      {/* 수정 저장 실패 UI — CheckinActionCard.tsx의 SAVE_FAILED 분기와 시각적으로
          동일한 구성을 복제한다(import해 재사용하지 않는다). CheckinActionCard는
          checkinFlow 상태 머신의 phase prop에 렌더를 분기하는 캡처 흐름 전용
          컴포넌트라, 상태 머신이 없는 이 화면(boolean dirty 추적, D-01)이 재사용하려면
          가짜 phase를 만들어 넘겨야 한다 — 그건 재사용이 아니라 오염이다. 문구 상수
          (CHECKIN_COPY.*)는 그대로 공유하므로 문구 드리프트는 없다. 이 블록은 저장
          실패 state가 참일 때만 마운트한다(disable이 아니라 조건부 마운트). */}
      {saveFailed && (
        <View style={styles.saveFailedCard}>
          <Text style={[typography.screenTitle, styles.saveFailedHeadline]}>
            {CHECKIN_COPY.saveFailedHeadline}
          </Text>
          <Text style={[typography.helperText, styles.saveFailedHelper]}>
            {CHECKIN_COPY.saveFailedHelper}
          </Text>
          <Pressable
            onPress={flushNoteAndPhoto}
            accessibilityRole="button"
            accessibilityLabel={CHECKIN_COPY.retryCta}
            style={styles.primaryButton}
          >
            <Text style={[typography.placeName, styles.primaryButtonLabel]}>
              {CHECKIN_COPY.retryCta}
            </Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  time: {
    color: colors.textPrimary,
  },
  map: {
    width: '100%',
    height: 160,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  // teardrop 핀 기하 — (tabs)/index/index.tsx:1186-1207의 pinWrapper/pinDrop/pinSaved
  // 스타일을 그대로 복제한 것(값을 재도출하지 않는다).
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
  },
  pinSaved: {
    backgroundColor: colors.pinSoft,
  },
  photo: {
    width: '100%',
    height: 240,
    borderRadius: radius.md,
    marginTop: spacing.lg,
  },
  photoEmpty: {
    height: 160,
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSoft,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoEmptyLabel: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // noteInput — CheckinActionCard.tsx의 noteInput 스타일 계약(minHeight/배경/모서리/
  // 내부 패딩)을 그대로 복제, 사진 블록 아래 spacing.lg 간격만 이 화면에 맞게 추가.
  noteInput: {
    minHeight: 96,
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  // 저장 실패 카드 — CheckinActionCard.tsx SAVE_FAILED 분기의 시각 구성을 복제:
  // screenTitle 헤드라인 → spacing.xs 간격 → helperText 보조문구 → spacing.md 간격 →
  // primaryButton.
  saveFailedCard: {
    marginTop: spacing.lg,
  },
  saveFailedHeadline: {
    color: colors.textPrimary,
  },
  saveFailedHelper: {
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  primaryButton: {
    minHeight: 44,
    marginTop: spacing.md,
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
