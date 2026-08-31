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
// 05-03-PLAN.md는 표시 계층(시각 → 정적 지도 미리보기 → 사진)까지 책임졌다.
// 05-04-PLAN.md가 메모 입력·저장·미저장 경고·AppState background flush·"지도 앱에서
// 열기" 딥링크를 이 파일에 이어 붙였다. 05-06-PLAN.md Task 1이 사진 슬롯을 탭하면
// 기존 첨부 흐름과 같은 액션시트(촬영/앨범)로 교체/추가하는 인터랙션(D-03)을 더한다
// — 사진 삭제 배지(D-04)는 Task 2 몫으로 다음 슬롯에 남겨둔다.
//
// D-05: 이 화면에 체크인 전체 삭제 진입점을 두지 않는다 — 삭제는 오늘 뷰 리스트
// 스와이프로만 제공되며(05-05-PLAN.md), 상세화면은 편집 전용 공간으로 유지한다.
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Linking from 'expo-linking';
import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { formatLocalTime, formatLocalMonthDay, toIsoTimestamp } from './localDate';
import { CHECKIN_COPY, CHECKIN_DETAIL_COPY } from './checkinFlow';
import { MAP_REGION_DELTA } from './config';
import MapView, { Marker } from 'react-native-maps';
import { useNavigation } from 'expo-router';
import { getCheckinById, runWithSingleRetry, updateCheckinNoteAndPhoto } from './checkinRepo';
import {
  PHOTO_ACTION_SHEET_CANCEL_INDEX,
  PHOTO_ACTION_SHEET_OPTIONS,
  PHOTO_SOURCE_BY_ACTION_SHEET_INDEX,
  pickAndCopyPhoto,
} from './photos';
import { defaultPhotoStorageDeps } from './deps';
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
  // photoPathRef — flushNoteAndPhoto가 checkin state를 deps에 담지 않도록 최신
  // photo_path를 ref로 미러링해둔다. 05-06-PLAN.md부터는 사진 교체/삭제 핸들러도
  // 이 ref를 읽고 쓴다(성공 후에만 갱신 — 아래 handlePickPhoto 참고).
  const photoPathRef = useRef<string | null>(null);
  const isDirtyRef = useRef(false);
  const [saveFailed, setSaveFailed] = useState(false);
  // 사진 첨부 실패 state — 캡처 흐름(CheckinActionCard)의 photoError와 동일한 역할이나
  // 이 화면 로컬 state로 별도 관리한다(캡처 흐름의 phase 상태 머신과 섞지 않는다).
  const [photoError, setPhotoError] = useState(false);

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

  // 05-06-PLAN.md Task 1 — 사진 슬롯 탭 시 교체/추가(D-03). (tabs)/index/index.tsx의
  // 사진 액션시트 관용구를 그대로 적응한다: photos.ts가 소유한 옵션/취소 인덱스/출처
  // 매핑 상수를 그대로 소비하고 이 파일에 재정의하지 않는다. 사진 편집은 메모와 달리
  // dirty 추적 대상이 아니다 — isDirtyRef를 건드리지 않고, 성공 즉시 DB에 반영한다
  // (05-UI-SPEC.md §저장 트리거 매트릭스: "사진 삭제·교체 → 즉시 저장, 경고 대상 아님").
  const handlePickPhoto = useCallback(() => {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [...PHOTO_ACTION_SHEET_OPTIONS],
        cancelButtonIndex: PHOTO_ACTION_SHEET_CANCEL_INDEX,
      },
      (buttonIndex) => {
        const source = PHOTO_SOURCE_BY_ACTION_SHEET_INDEX[buttonIndex];
        if (!source) return;

        pickAndCopyPhoto(source)
          .then((result) => {
            if (!isMountedRef.current || result === null) return;
            if ('error' in result) {
              setPhotoError(true);
              return;
            }
            setPhotoError(false);

            // 원자성 순서(연구 문서의 Pitfall 5, 05-CONTEXT.md Claude's Discretion
            // 확정 답) — ① 새 파일 저장은 위 호출이 이미 완료했다. ② DB 갱신이
            // 성공한 뒤에만 ③ 이전 사진 파일을 정리한다. 순서를 뒤집어 구 파일부터
            // 지우면, 저장이 실패했을 때 새 파일도 구 파일도 남지 않는 상태가 된다
            // — 절대 뒤집지 않는다. previousPhotoPath는 DB 갱신을 부르기 전에
            // 지역 변수로 붙잡아 둔다(성공 후 photoPathRef가 갱신되면 더는 읽을
            // 수 없다).
            const previousPhotoPath = photoPathRef.current;
            updateCheckinNoteAndPhoto(db, checkinId, {
              // note 인자로 noteRef.current를 함께 넘기는 이유: 이 갱신 함수가 note와
              // photoPath 두 필드를 함께 받는 계약이라, 사진만 바꿀 때도 현재 메모
              // 값을 같이 보내지 않으면 편집 중이던 메모가 덮어쓰기로 사라진다.
              note: noteRef.current || null,
              photoPath: result.uri,
              now: toIsoTimestamp(),
            })
              .then(() => {
                if (!isMountedRef.current) return;
                photoPathRef.current = result.uri;
                setCheckin((prev) => (prev ? { ...prev, photo_path: result.uri } : prev));
                if (previousPhotoPath) {
                  // 구 파일 정리는 non-blocking이다 — DB는 이미 새 사진을 가리키고
                  // 있으므로 이 호출이 실패해도 고아 파일만 남길 뿐 데이터 유실이
                  // 아니다(사용자에게 오류를 노출하지 않는다).
                  defaultPhotoStorageDeps
                    .deleteFile(previousPhotoPath)
                    .catch((error) => {
                      console.error('Failed to delete replaced photo file', error);
                    });
                }
              })
              .catch((error) => {
                console.error('Failed to persist replaced photo to checkin row', error);
              });
          })
          .catch((error) => {
            console.error('Failed to pick and copy photo', error);
            if (isMountedRef.current) {
              setPhotoError(true);
            }
          });
      }
    );
  }, [db, checkinId]);

  // AppState 백그라운드 강제 flush(REQ-checkin-detail-flush, D-02) — (tabs)/index/
  // index.tsx의 기존 리스너와 동일한 관용구를 복제한다(같은 리스너를 공유/재사용하는
  // 게 아니라 각 화면이 각자의 dirty state에 대해 같은 패턴을 한 번 더 구독). 반드시
  // active 가드를 먼저 확인한다 — active로 돌아올 때도 콜백이 불리므로 이 가드가
  // 없으면 포그라운드 복귀 시 의도치 않은 저장이 발생한다(05-RESEARCH.md
  // Anti-Patterns). 가드를 통과하면 dirty일 때만 조용히 flush한다 — 다이얼로그/Alert를
  // 절대 띄우지 않는다(D-02: OS 백그라운드 전환은 조용히, 경고는 인앱 이탈 전용).
  // deps는 [flushNoteAndPhoto] 하나만 둔다 — flushNoteAndPhoto가 [db, checkinId]에만
  // 의존하는 안정적 useCallback이라 매 키 입력마다 이 리스너가 재구독되지 않는다
  // (isDirtyRef/noteRef ref 미러 관용구가 최신 값 접근을 담당).
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') return;
      if (isDirtyRef.current) {
        flushNoteAndPhoto();
      }
    });
    return () => subscription.remove();
  }, [flushNoteAndPhoto]);

  // beforeRemove — 인앱 이탈(뒤로가기/스와이프백) 미저장 경고(D-01). 헤더 뒤로가기
  // 버튼과 엣지 스와이프백 둘 다 React Navigation의 동일한 POP 액션 디스패치
  // 파이프라인에 물려 있어 우회 경로 없이 똑같이 이 리스너를 거친다
  // (05-RESEARCH.md Pattern 4가 expo-router/build/react-navigation/core/
  // useOnPreventRemove.js 소스로 직접 검증). usePreventRemove(내부 구현, 공개 API
  // 아님) 대신 useNavigation()의 공개 addListener API만 쓴다.
  //
  // 세 버튼 모두 iOS 기본(강조 없는) 스타일이다 — 경고성 강조 스타일을 절대 쓰지
  // 않는다. iOS는 그 강조 스타일 버튼을 자동으로 빨간 텍스트로 렌더하는데, DESIGN.md는
  // UI 전역에서 빨강 계열 시맨틱 색상을 금지한다(Phase 4가 발견한 "탭바 기본 파란
  // 틴트"와 같은 종류의 놓치기 쉬운 플랫폼 기본값 함정) — 버튼 순서와 문구로만 옵션을
  // 구분한다.
  //
  // 막았던 pop 액션 객체를 나중에 그대로 navigation.dispatch에 넘기면 원래 막았던
  // 화면 전환이 재실행된다 — React Navigation의 표준 "preventing going back" 관용구다.
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (!isDirtyRef.current) return;
      e.preventDefault();
      Alert.alert(CHECKIN_DETAIL_COPY.unsavedTitle, undefined, [
        { text: CHECKIN_DETAIL_COPY.keepEditing, style: 'default' },
        {
          text: CHECKIN_DETAIL_COPY.discardAndLeave,
          style: 'default',
          onPress: () => navigation.dispatch(e.data.action),
        },
        {
          text: CHECKIN_DETAIL_COPY.saveAndLeave,
          style: 'default',
          onPress: () => {
            flushNoteAndPhoto();
            navigation.dispatch(e.data.action);
          },
        },
      ]);
    });
    return sub;
  }, [navigation, flushNoteAndPhoto]);

  // 로드 전(state 초기값) + 존재하지 않는 id(getCheckinById가 null 반환) 둘 다 같은
  // 빈 렌더로 처리한다 — 이 화면은 "이미 존재하는 체크인 1건"에 대한 화면이라 빈
  // 상태 개념이 없다(05-UI-SPEC.md §Copywriting Contract "Empty state: 해당 없음").
  if (!checkin) return null;

  // "지도 앱에서 열기" — flush를 먼저 await한 뒤에만 Linking.openURL을 호출한다(순서가
  // 이 계약의 핵심 — 뒤집으면 저장되지 않은 메모가 딥링크로 인한 background 전환 중에
  // 유실될 위험이 생긴다). Task 3의 AppState 리스너가 별도로도 안전망이 되지만, 호출
  // 직전에도 명시적으로 한 번 더 flush해 두 경로 모두 안전망이 되게 한다(DRY 다중
  // 트리거 원칙, day-end-reflection-map.md와 동일). 이중 저장은 같은 값을 두 번 쓰는
  // 것뿐이라 부작용이 없다. URL 템플릿에는 checkin.lat/checkin.lng(SQLite REAL, TS
  // number 타입) 두 값만 보간한다 — 메모 등 사용자 자유 입력 문자열은 절대 URL 구성에
  // 참여하지 않는다(T-05-08). URL scheme 존재 여부를 사전 확인하는 별도 체크는
  // 생략한다 — iOS 시스템 앱이라 항상 존재한다(product-design.md:943).
  const handleOpenInMaps = async () => {
    await flushNoteAndPhoto();
    await Linking.openURL(`http://maps.apple.com/?ll=${checkin.lat},${checkin.lng}`);
  };

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

      {/* 3. "지도 앱에서 열기" — 가벼운 보조 액션이라 muted 톤 텍스트 버튼을 쓴다. 진행
          상태 강조용 토큰과 목록 행 스와이프 어포던스 전용 토큰(05-05-PLAN.md,
          DESIGN.md 2026-08-31 갱신) 둘 다 이 버튼에는 쓰지 않는다 — 이 화면 전체가
          그 두 토큰의 승인된 용도 목록 밖이다. */}
      <Pressable
        onPress={handleOpenInMaps}
        accessibilityRole="button"
        accessibilityLabel={CHECKIN_DETAIL_COPY.openInMaps}
        style={styles.openInMapsButton}
      >
        <Text style={[typography.placeName, styles.openInMapsLabel]}>
          {CHECKIN_DETAIL_COPY.openInMaps}
        </Text>
      </Pressable>

      {/* 4. 사진 — 탭하면 사진 액션시트(교체/추가, D-03)가 열린다. 접근성 라벨은
          사진 유무에 따라 갈린다: 있으면 changePhoto, 없으면 기존 첨부 흐름과 같은
          문구(CheckinActionCard.tsx 선례). 사진 제거용 아이콘 배지(D-04)는
          05-06-PLAN.md Task 2가 사진이 있을 때만 이 슬롯 안에 추가한다. */}
      <Pressable
        onPress={handlePickPhoto}
        accessibilityRole="button"
        accessibilityLabel={
          checkin.photo_path ? CHECKIN_DETAIL_COPY.changePhoto : CHECKIN_COPY.photoPlaceholderLabel
        }
      >
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
      </Pressable>
      {photoError && (
        <Text style={[typography.helperText, styles.photoErrorLabel]}>
          {CHECKIN_COPY.photoFailed}
        </Text>
      )}

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
  openInMapsButton: {
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  openInMapsLabel: {
    color: colors.textMuted,
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
  photoErrorLabel: {
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
