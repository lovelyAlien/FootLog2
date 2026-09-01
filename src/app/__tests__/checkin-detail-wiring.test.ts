/**
 * @jest-environment node
 */
// src/app/__tests__/checkin-detail-wiring.test.ts
// 05-03-PLAN.md Task 3 — 상세화면 라우트 구조/레이아웃 순서/지도 잠금/토큰 규율/D-05
// 회귀 가드. tabs-wiring.test.ts와 동일한 기법(fs.readFileSync + stripComments 정적
// 소스 분석, RN 렌더 없음)을 그대로 재사용한다. 05-04/05-06-PLAN.md가 같은 화면
// 파일(CheckinDetailScreen.tsx)에 딥링크·메모·사진 교체/삭제를 이어 붙이므로 describe
// 블록을 목적별로 나눠 다음 plan이 assertion을 이어서 추가하기 쉽게 한다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

// CheckinDetailScreen.tsx는 src/app/ 밖(src/checkin/)에 있다 — tabs-wiring.test.ts가
// today/content.ts를 읽을 때 쓴 것과 동일한 상위 디렉토리 접근 방식.
function readSrcSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, '..', relativePath), 'utf-8');
}

const routeSource = readSource(path.join('(tabs)', 'index', '[id].tsx'));
const routeCodeOnly = stripComments(routeSource);
const layoutSource = readSource(path.join('(tabs)', 'index', '_layout.tsx'));
const layoutCodeOnly = stripComments(layoutSource);
const detailScreenSource = readSrcSource(path.join('checkin', 'CheckinDetailScreen.tsx'));
const detailScreenCodeOnly = stripComments(detailScreenSource);

describe('상세 라우트 구조 계약', () => {
  it('Test 1: (tabs)/index/[id].tsx가 존재하고 _layout.tsx가 name="[id]"를 등록한다', () => {
    expect(fs.existsSync(path.join(APP_DIR, '(tabs)', 'index', '[id].tsx'))).toBe(true);
    expect(layoutCodeOnly).toMatch(/<Stack\.Screen\s+name="\[id\]"/);
  });

  it('Test 2 (05-RESEARCH.md Pitfall 2 회귀 가드): _layout.tsx에서 [id] 등록에 headerShown: true가 함께 등장한다', () => {
    const match = layoutCodeOnly.match(/<Stack\.Screen\s+name="\[id\]"[^/]*\/>/);
    expect(match).not.toBeNull();
    expect(match ? match[0] : '').toMatch(/headerShown:\s*true/);
  });

  it('Test 3 (얇은 래퍼 계약): [id].tsx에 StyleSheet/getCheckinById/useState가 등장하지 않는다', () => {
    expect(routeCodeOnly).not.toMatch(/\bStyleSheet\b/);
    expect(routeCodeOnly).not.toMatch(/\bgetCheckinById\b/);
    expect(routeCodeOnly).not.toMatch(/\buseState\b/);
  });

  it('Test 4 (Phase 6 재사용 구조 가드): [id].tsx가 CheckinDetailScreen을 src/checkin/에서 import한다', () => {
    expect(routeCodeOnly).toMatch(
      /import\s*\{\s*CheckinDetailScreen\s*\}\s*from\s*['"]\.\.\/\.\.\/\.\.\/checkin\/CheckinDetailScreen['"]/
    );
  });
});

describe('상세화면 고정 레이아웃 순서 (REQ-checkin-detail-layout)', () => {
  // 05-04-PLAN.md Task 3 — 05-03-PLAN.md가 예고한 대로 3요소를 5요소로 확장한다:
  // formatLocalTime(시각) < MapView(정적 지도) < openInMaps(지도 앱 열기) < photo_path
  // (사진) < notePlaceholder(메모). photo_path는 데이터 로드 useEffect(row?.photo_path)
  // 안에도 등장하므로, 실제 렌더 JSX(<ScrollView 이후)만 슬라이스해 순서를 검사한다 —
  // 그렇지 않으면 로드 로직의 이른 등장이 레이아웃 순서 단언을 오염시킨다.
  it('Test 5: formatLocalTime < MapView < openInMaps < photo_path < notePlaceholder 순서로 등장한다(렌더 JSX 범위)', () => {
    const jsxStart = detailScreenCodeOnly.indexOf('<ScrollView');
    expect(jsxStart).toBeGreaterThanOrEqual(0);
    const jsx = detailScreenCodeOnly.slice(jsxStart);
    const timeIndex = jsx.indexOf('formatLocalTime');
    const mapIndex = jsx.indexOf('MapView');
    const openInMapsIndex = jsx.indexOf('openInMaps');
    const photoIndex = jsx.indexOf('photo_path');
    const noteIndex = jsx.indexOf('notePlaceholder');
    expect(timeIndex).toBeGreaterThanOrEqual(0);
    expect(mapIndex).toBeGreaterThan(timeIndex);
    expect(openInMapsIndex).toBeGreaterThan(mapIndex);
    expect(photoIndex).toBeGreaterThan(openInMapsIndex);
    expect(noteIndex).toBeGreaterThan(photoIndex);
  });

  it('Test 6: formatLocalMonthDay가 등장한다 (헤더 타이틀)', () => {
    expect(detailScreenCodeOnly).toMatch(/formatLocalMonthDay\(/);
  });
});

describe('정적 지도 미리보기 인터랙션 잠금', () => {
  it('Test 7: scrollEnabled/zoomEnabled/rotateEnabled/pitchEnabled/pointerEvents 5개가 전부 잠겨있다', () => {
    expect(detailScreenCodeOnly).toMatch(/scrollEnabled=\{false\}/);
    expect(detailScreenCodeOnly).toMatch(/zoomEnabled=\{false\}/);
    expect(detailScreenCodeOnly).toMatch(/rotateEnabled=\{false\}/);
    expect(detailScreenCodeOnly).toMatch(/pitchEnabled=\{false\}/);
    expect(detailScreenCodeOnly).toMatch(/pointerEvents="none"/);
  });

  it('Test 8 (상수 중복 선언 가드): MAP_REGION_DELTA = 0.01 재선언이 등장하지 않는다', () => {
    expect(detailScreenCodeOnly).not.toMatch(/MAP_REGION_DELTA\s*=\s*0\.01/);
  });
});

describe('상세화면 색상/토큰 규율', () => {
  it('Test 9: colors.pinSoft가 등장하고 colors.pin(단어 경계)은 등장하지 않는다', () => {
    expect(detailScreenCodeOnly).toMatch(/colors\.pinSoft\b/);
    expect(detailScreenCodeOnly).not.toMatch(/colors\.pin\b/);
  });

  it('Test 10 (2026-08-31 DESIGN.md 갱신 이후 accent는 캘린더 탭 전용): colors.accent가 등장하지 않는다', () => {
    expect(detailScreenCodeOnly).not.toMatch(/colors\.accent\b/);
  });

  it('Test 11: hex 컬러 리터럴이 등장하지 않는다', () => {
    expect(detailScreenCodeOnly).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });

  it("Test 12 (프레젠테이셔널 계약 예외 — 사진 삭제 배지 오버레이 한 곳만, 05-06-PLAN.md Task 2, D-04): position: 'absolute'가 정확히 1회 등장한다", () => {
    const matches = detailScreenCodeOnly.match(/position:\s*'absolute'/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe('D-05: 상세화면에 체크인 삭제 진입점이 없다', () => {
  // 05-06-PLAN.md가 사진 삭제 배지(D-04, SF Symbol "trash")를 추가하면서 trash 전면
  // 부재 단언은 더는 성립하지 않는다 — D-05의 본질은 "체크인 전체 삭제로 이어지는
  // 식별자"의 부재이므로, deleteCheckin/UndoSnackbar 미등장으로 정교화한다. 사진
  // 삭제(CHECKIN_DETAIL_COPY.deletePhoto)는 체크인 전체 삭제와 무게가 다른 별개
  // 액션이다(D-04) — trash 아이콘은 이제 이 화면에 정당하게 존재한다.
  it('Test 13: deleteCheckin/UndoSnackbar가 등장하지 않는다(체크인 전체 삭제와 무관)', () => {
    expect(detailScreenCodeOnly).not.toMatch(/deleteCheckin/);
    expect(detailScreenCodeOnly).not.toMatch(/UndoSnackbar/);
  });

  it("Test 13b: '삭제' 한글 리터럴이 소스에 직접 등장하지 않는다(전부 CHECKIN_DETAIL_COPY 상수 참조)", () => {
    expect(detailScreenCodeOnly).not.toContain('삭제');
  });
});

// 05-04-PLAN.md Task 3 — 이하 4개 describe는 05-04-PLAN.md가 신규로 추가하는 회귀
// 가드다(미저장 경고/AppState flush/Maps 딥링크/자동저장 미채택).
describe('미저장 경고 (D-01)', () => {
  it('Test 14: addListener("beforeRemove"가 등장하고 isDirtyRef 조기 반환 가드가 존재한다', () => {
    expect(detailScreenCodeOnly).toMatch(/addListener\('beforeRemove'/);
    expect(detailScreenCodeOnly).toMatch(/if\s*\(!isDirtyRef\.current\)\s*return;/);
  });

  it('Test 15: e.preventDefault()가 등장하고 e.data.action이 정확히 2회(저장 안 함 + 저장 후 나가기) 등장한다', () => {
    expect(detailScreenCodeOnly).toMatch(/e\.preventDefault\(\)/);
    const matches = detailScreenCodeOnly.match(/e\.data\.action/g) ?? [];
    expect(matches.length).toBe(2);
  });

  it('Test 16: CHECKIN_DETAIL_COPY의 3개 버튼 키(keepEditing/discardAndLeave/saveAndLeave)가 전부 등장한다', () => {
    expect(detailScreenCodeOnly).toMatch(/CHECKIN_DETAIL_COPY\.keepEditing/);
    expect(detailScreenCodeOnly).toMatch(/CHECKIN_DETAIL_COPY\.discardAndLeave/);
    expect(detailScreenCodeOnly).toMatch(/CHECKIN_DETAIL_COPY\.saveAndLeave/);
  });

  it("Test 17 (빨강 금지 회귀 가드): style: 'destructive'가 0회 등장한다", () => {
    expect(detailScreenCodeOnly).not.toMatch(/style:\s*'destructive'/);
  });
});

describe('AppState 백그라운드 flush (REQ-checkin-detail-flush, D-02)', () => {
  it("Test 18: AppState.addEventListener('change'가 등장하고 nextAppState === 'active' 가드가 존재한다", () => {
    expect(detailScreenCodeOnly).toMatch(/AppState\.addEventListener\('change'/);
    expect(detailScreenCodeOnly).toMatch(/nextAppState === 'active'/);
  });

  it('Test 19: subscription.remove() cleanup이 존재한다', () => {
    expect(detailScreenCodeOnly).toMatch(/subscription\.remove\(\)/);
  });

  it('Test 20 (D-02 — 조용한 flush): AppState 리스너 콜백 블록 안에 Alert가 등장하지 않는다', () => {
    const listenerStart = detailScreenCodeOnly.indexOf("AppState.addEventListener('change'");
    const cleanupIndex = detailScreenCodeOnly.indexOf('subscription.remove()', listenerStart);
    expect(listenerStart).toBeGreaterThanOrEqual(0);
    expect(cleanupIndex).toBeGreaterThan(listenerStart);
    const listenerBlock = detailScreenCodeOnly.slice(listenerStart, cleanupIndex);
    expect(listenerBlock).not.toMatch(/Alert/);
  });
});

describe('Maps 딥링크 (REQ-maps-deeplink)', () => {
  it('Test 21: maps.apple.com이 등장하고 canOpenURL은 등장하지 않는다', () => {
    expect(detailScreenCodeOnly).toMatch(/maps\.apple\.com/);
    expect(detailScreenCodeOnly).not.toMatch(/canOpenURL/);
  });

  it('Test 22 (flush 선행 계약): handleOpenInMaps 안에서 flushNoteAndPhoto 호출이 Linking.openURL 호출보다 앞선다', () => {
    const handlerStart = detailScreenCodeOnly.indexOf('handleOpenInMaps');
    expect(handlerStart).toBeGreaterThanOrEqual(0);
    const handlerBody = detailScreenCodeOnly.slice(handlerStart);
    const flushIndex = handlerBody.indexOf('flushNoteAndPhoto');
    const openUrlIndex = handlerBody.indexOf('Linking.openURL');
    expect(flushIndex).toBeGreaterThanOrEqual(0);
    expect(openUrlIndex).toBeGreaterThan(flushIndex);
  });

  it('Test 23 (T-05-08): URL 템플릿 보간 인자가 checkin.lat/checkin.lng뿐이다', () => {
    expect(detailScreenCodeOnly).toMatch(/ll=\$\{checkin\.lat\},\$\{checkin\.lng\}/);
  });
});

describe('자동저장 미채택 (D-01 vs Phase 7)', () => {
  // Phase 7(하루 마무리 회고)의 5초 디바운스 자동저장 패턴으로 이 화면을 "통일"하려는
  // 유혹을 막는 가드 — 사용자가 05-CONTEXT.md D-01에서 명시적 미저장 경고 방식을
  // 선택했으므로, 디바운스/타이머/blur 기반 자동저장 경로가 이 화면 소스에 존재해서는
  // 안 된다.
  it('Test 24: setTimeout/debounce/onBlur가 등장하지 않는다', () => {
    expect(detailScreenCodeOnly).not.toMatch(/setTimeout/);
    expect(detailScreenCodeOnly).not.toMatch(/debounce/);
    expect(detailScreenCodeOnly).not.toMatch(/onBlur/);
  });
});

// 05-06-PLAN.md Task 2 — 이하 3개 describe는 사진 교체/삭제(D-03/D-04) 및 파일 삭제
// 순서 원자성(Pitfall 5)에 대한 신규 회귀 가드다.
describe('사진 교체/삭제 (D-03/D-04)', () => {
  it('Test 25: 사진 액션시트 호출과 pickAndCopyPhoto가 등장한다', () => {
    expect(detailScreenCodeOnly).toMatch(/ActionSheetIOS\.showActionSheetWithOptions/);
    expect(detailScreenCodeOnly).toMatch(/pickAndCopyPhoto\(/);
  });

  it("Test 26 (photos.ts 상수 재사용, 재정의 금지): '사진 촬영'/'앨범에서 선택' 리터럴이 등장하지 않는다", () => {
    expect(detailScreenCodeOnly).not.toContain('사진 촬영');
    expect(detailScreenCodeOnly).not.toContain('앨범에서 선택');
  });

  it('Test 27 (deps.ts 격리 유지): expo-file-system 직접 import가 등장하지 않는다', () => {
    expect(detailScreenCodeOnly).not.toMatch(/expo-file-system/);
  });

  it('Test 28: CHECKIN_DETAIL_COPY.changePhoto/deletePhoto 참조가 존재한다', () => {
    expect(detailScreenCodeOnly).toMatch(/CHECKIN_DETAIL_COPY\.changePhoto/);
    expect(detailScreenCodeOnly).toMatch(/CHECKIN_DETAIL_COPY\.deletePhoto/);
  });

  it('Test 29 (D-04 색상 회귀 가드): 사진 삭제 배지가 colors.textMuted를 쓰고 colors.pin/colors.accent는 쓰지 않는다', () => {
    expect(detailScreenCodeOnly).toMatch(/colors\.textMuted/);
    expect(detailScreenCodeOnly).not.toMatch(/colors\.accent\b/);
    expect(detailScreenCodeOnly).not.toMatch(/colors\.pin\b/);
  });

  it('Test 30 (D-04 — 확인 다이얼로그 없음): Alert 호출이 전체 파일에서 1회뿐이다(미저장 경고 전용, 사진 삭제는 대상 아님)', () => {
    const matches = detailScreenCodeOnly.match(/Alert\.alert\(/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe('사진 파일 삭제 순서 원자성 (Pitfall 5)', () => {
  it('Test 31 (교체 경로): handlePickPhoto 구간에서 updateCheckinNoteAndPhoto가 deleteFile보다 먼저 등장한다', () => {
    const start = detailScreenCodeOnly.indexOf('handlePickPhoto');
    const end = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = detailScreenCodeOnly.slice(start, end);
    const updateIndex = block.indexOf('updateCheckinNoteAndPhoto');
    const deleteFileIndex = block.indexOf('deleteFile(');
    expect(updateIndex).toBeGreaterThanOrEqual(0);
    expect(deleteFileIndex).toBeGreaterThan(updateIndex);
  });

  it('Test 32 (삭제 경로): handleDeletePhoto 구간에서 updateCheckinNoteAndPhoto가 deleteFile보다 먼저 등장한다', () => {
    const start = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = detailScreenCodeOnly.slice(start);
    const updateIndex = block.indexOf('updateCheckinNoteAndPhoto');
    const deleteFileIndex = block.indexOf('deleteFile(');
    expect(updateIndex).toBeGreaterThanOrEqual(0);
    expect(deleteFileIndex).toBeGreaterThan(updateIndex);
  });

  it('Test 33 (non-blocking): deleteFile 호출이 모두 .catch(로 이어진다(교체 경로 1 + 삭제 경로 1)', () => {
    const matches = detailScreenCodeOnly.match(/deleteFile\([^)]*\)\s*\.catch\(/g) ?? [];
    expect(matches.length).toBe(2);
  });
});

describe('사진 편집은 미저장 경고 대상이 아니다 (D-04)', () => {
  it('Test 34: 사진 핸들러 구간(handlePickPhoto~handleDeletePhoto 끝)에 isDirtyRef.current = true 대입이 없다', () => {
    const start = detailScreenCodeOnly.indexOf('handlePickPhoto');
    const end = detailScreenCodeOnly.indexOf('if (!checkin) return null;');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = detailScreenCodeOnly.slice(start, end);
    expect(block).not.toMatch(/isDirtyRef\.current\s*=\s*true/);
  });

  it('Test 35: UndoSnackbar import가 등장하지 않는다(체크인 전체 삭제 undo와 혼용 금지)', () => {
    expect(detailScreenCodeOnly).not.toMatch(/UndoSnackbar/);
  });
});

describe('05-REVIEW.md 코드 리뷰 대응 회귀 가드', () => {
  it('Test 36 (WR-01): 초기 체크인 로드가 .then 뒤에 .catch(로 에러를 처리한다', () => {
    const start = detailScreenCodeOnly.indexOf('getCheckinById(db, checkinId)');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = detailScreenCodeOnly.slice(start, start + 500);
    const thenIndex = block.indexOf('.then(');
    const catchIndex = block.indexOf('.catch(');
    expect(thenIndex).toBeGreaterThanOrEqual(0);
    expect(catchIndex).toBeGreaterThan(thenIndex);
  });

  it('Test 37 (WR-02): handlePickPhoto 성공 분기가 isDirtyRef/saveFailed를 초기화한다', () => {
    const start = detailScreenCodeOnly.indexOf('handlePickPhoto');
    const end = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = detailScreenCodeOnly.slice(start, end);
    expect(block).toMatch(/isDirtyRef\.current\s*=\s*false/);
    expect(block).toMatch(/setSaveFailed\(false\)/);
  });

  it('Test 38 (WR-02): handleDeletePhoto 성공 분기가 isDirtyRef/saveFailed를 초기화한다', () => {
    const start = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    const end = detailScreenCodeOnly.indexOf('if (!checkin) return null;');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = detailScreenCodeOnly.slice(start, end);
    expect(block).toMatch(/isDirtyRef\.current\s*=\s*false/);
    expect(block).toMatch(/setSaveFailed\(false\)/);
  });

  it('Test 39 (WR-03): handlePickPhoto의 사진 DB 쓰기가 runWithSingleRetry로 감싸여 있다', () => {
    const start = detailScreenCodeOnly.indexOf('handlePickPhoto');
    const end = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    const block = detailScreenCodeOnly.slice(start, end);
    const retryIndex = block.indexOf('runWithSingleRetry(');
    const updateIndex = block.indexOf('updateCheckinNoteAndPhoto');
    expect(retryIndex).toBeGreaterThanOrEqual(0);
    expect(updateIndex).toBeGreaterThan(retryIndex);
  });

  it('Test 40 (WR-03): handleDeletePhoto의 사진 DB 쓰기가 runWithSingleRetry로 감싸여 있다', () => {
    const start = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    const end = detailScreenCodeOnly.indexOf('if (!checkin) return null;');
    const block = detailScreenCodeOnly.slice(start, end);
    const retryIndex = block.indexOf('runWithSingleRetry(');
    const updateIndex = block.indexOf('updateCheckinNoteAndPhoto');
    expect(retryIndex).toBeGreaterThanOrEqual(0);
    expect(updateIndex).toBeGreaterThan(retryIndex);
  });

  it('Test 41 (WR-03): 사진 DB 쓰기 실패 시 setPhotoError(true)가 등장한다(pick 실패 2곳 + write 실패 2곳 = 4)', () => {
    const occurrences = detailScreenCodeOnly.match(/setPhotoError\(true\)/g) ?? [];
    expect(occurrences.length).toBe(4);
  });

  it('Test 42 (사진 고정 크기): photo 스타일이 contentFit="cover"로 렌더된다(가로/세로 사진 모두 동일한 박스 크기로 보이도록)', () => {
    expect(detailScreenCodeOnly).toMatch(/contentFit="cover"/);
  });
});

describe('메모 편집/저장 UX (2026-09-01 사용자 피드백 — 항상 편집 가능 대신 명시적 편집/저장 버튼)', () => {
  it('Test 43: CHECKIN_DETAIL_COPY.editNote/saveNote 키가 등장한다', () => {
    expect(detailScreenCodeOnly).toMatch(/CHECKIN_DETAIL_COPY\.editNote/);
    expect(detailScreenCodeOnly).toMatch(/CHECKIN_DETAIL_COPY\.saveNote/);
  });

  it('Test 44: isEditingNote state로 뷰/편집 모드를 조건부 렌더한다', () => {
    expect(detailScreenCodeOnly).toMatch(/isEditingNote/);
    expect(detailScreenCodeOnly).toMatch(/isEditingNote\s*\?/);
  });

  it('Test 45: 편집 버튼이 setIsEditingNote(true)를 호출한다', () => {
    expect(detailScreenCodeOnly).toMatch(/setIsEditingNote\(true\)/);
  });

  it('Test 46: handleSaveNotePress가 flushNoteAndPhoto 호출 후 성공 시에만 편집 모드를 닫는다', () => {
    const start = detailScreenCodeOnly.indexOf('handleSaveNotePress');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = detailScreenCodeOnly.slice(start, start + 400);
    expect(block).toMatch(/flushNoteAndPhoto\(\)/);
    expect(block).toMatch(/setIsEditingNote\(false\)/);
  });

  it('Test 47: 편집 모드 TextInput에 autoFocus가 붙어 편집 진입 즉시 입력 가능하다', () => {
    const editingBlockStart = detailScreenCodeOnly.indexOf('isEditingNote ?');
    expect(editingBlockStart).toBeGreaterThanOrEqual(0);
    const block = detailScreenCodeOnly.slice(editingBlockStart, editingBlockStart + 600);
    expect(block).toMatch(/<TextInput[\s\S]*?autoFocus/);
  });

  it('Test 48: 뷰 모드에서는 note가 있으면 note를, 없으면 notePlaceholder를 보여준다', () => {
    expect(detailScreenCodeOnly).toMatch(/note\s*\|\|\s*CHECKIN_COPY\.notePlaceholder/);
  });
});

describe('키보드가 메모 입력을 가리지 않는다 (2026-09-01 사용자 피드백)', () => {
  it('Test 49: ScrollView에 automaticallyAdjustKeyboardInsets이 붙어있다', () => {
    const start = detailScreenCodeOnly.indexOf('<ScrollView');
    expect(start).toBeGreaterThanOrEqual(0);
    const block = detailScreenCodeOnly.slice(start, start + 300);
    expect(block).toMatch(/automaticallyAdjustKeyboardInsets/);
  });
});

describe('편집 중 스와이프백 차단 (2026-09-01 사용자 피드백 — beforeRemove 경고를 근본적으로 회피)', () => {
  it('Test 50: handleChangeNote가 dirty 진입 시 navigation.setOptions({ gestureEnabled: false })를 호출한다', () => {
    const start = detailScreenCodeOnly.indexOf('function handleChangeNote');
    const end = detailScreenCodeOnly.indexOf('handleEditNotePress', start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = detailScreenCodeOnly.slice(start, end);
    expect(block).toMatch(/isDirtyRef\.current\s*=\s*true/);
    expect(block).toMatch(/navigation\.setOptions\(\{\s*gestureEnabled:\s*false\s*\}\)/);
  });

  it('Test 51: flushNoteAndPhoto 성공 분기가 navigation.setOptions({ gestureEnabled: true })로 스와이프백을 복원한다', () => {
    const start = detailScreenCodeOnly.indexOf('const flushNoteAndPhoto');
    const end = detailScreenCodeOnly.indexOf('function handleChangeNote');
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const block = detailScreenCodeOnly.slice(start, end);
    expect(block).toMatch(/isDirtyRef\.current\s*=\s*false;\s*setSaveFailed\(false\);\s*navigation\.setOptions\(\{\s*gestureEnabled:\s*true\s*\}\)/);
  });

  it('Test 52: handlePickPhoto 성공 분기도 gestureEnabled를 true로 복원한다(메모가 dirty였다가 사진 저장으로 같이 커밋되는 경우)', () => {
    const start = detailScreenCodeOnly.indexOf('handlePickPhoto');
    const end = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    const block = detailScreenCodeOnly.slice(start, end);
    expect(block).toMatch(/isDirtyRef\.current\s*=\s*false;\s*setSaveFailed\(false\);\s*navigation\.setOptions\(\{\s*gestureEnabled:\s*true\s*\}\)/);
  });

  it('Test 53: handleDeletePhoto 성공 분기도 gestureEnabled를 true로 복원한다', () => {
    const start = detailScreenCodeOnly.indexOf('handleDeletePhoto');
    const end = detailScreenCodeOnly.indexOf('if (!checkin) return null;');
    const block = detailScreenCodeOnly.slice(start, end);
    expect(block).toMatch(/isDirtyRef\.current\s*=\s*false;\s*setSaveFailed\(false\);\s*navigation\.setOptions\(\{\s*gestureEnabled:\s*true\s*\}\)/);
  });

  it('Test 54 (카운트 회귀 가드): gestureEnabled: false가 1회, gestureEnabled: true가 3회 등장한다', () => {
    const falseOccurrences = detailScreenCodeOnly.match(/gestureEnabled:\s*false/g) ?? [];
    const trueOccurrences = detailScreenCodeOnly.match(/gestureEnabled:\s*true/g) ?? [];
    expect(falseOccurrences.length).toBe(1);
    expect(trueOccurrences.length).toBe(3);
  });
});
