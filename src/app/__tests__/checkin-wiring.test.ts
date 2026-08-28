/**
 * @jest-environment node
 */
// src/app/__tests__/checkin-wiring.test.ts
// 03-09-PLAN.md Task 2 배선 계약 회귀 가드. notification-wiring.test.ts와 동일한
// 기법(정적 소스 분석, fs.readFileSync + stripComments)을 그대로 재사용한다 — RN
// 렌더 환경이 필요 없다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const APP_DIR = path.join(__dirname, '..');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

describe('src/app/index.tsx 체크인 배선 계약 (Plan 03-09)', () => {
  const indexSource = readSource('index.tsx');
  const codeOnly = stripComments(indexSource);

  it('Test 1: resolveCheckinLocation 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\bresolveCheckinLocation\b/);
  });

  it('Test 2: requestLocationPermission 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\brequestLocationPermission\b/);
  });

  it('Test 3: upsertDraft 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\bupsertDraft\b/);
  });

  it('Test 4: updateDraftCoordinate 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\bupdateDraftCoordinate\b/);
  });

  it('Test 5: getLatestCheckinCoordinate 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\bgetLatestCheckinCoordinate\b/);
  });

  it('Test 6: <Marker가 draggable prop과 함께 등장한다', () => {
    expect(indexSource).toMatch(/<Marker/);
    // <Marker와 draggable 사이에 다른 JSX 태그가 끼어들지 않는지까지는 보지 않되,
    // 같은 Marker 엘리먼트 선언부 안에 draggable이 존재하는지 근접 매칭으로 확인한다.
    expect(indexSource).toMatch(/<Marker[^>]*\bdraggable\b/s);
  });

  it('Test 7: onDragEnd 핸들러가 존재한다', () => {
    expect(indexSource).toMatch(/onDragEnd=\{/);
  });

  it('Test 8: 지도 스타일 토큰 결정 회귀 가드 — colors.mapLand/mapRoad/mapWater/customMapStyle/PROVIDER_GOOGLE가 등장하지 않는다', () => {
    expect(codeOnly).not.toMatch(/colors\.mapLand/);
    expect(codeOnly).not.toMatch(/colors\.mapRoad/);
    expect(codeOnly).not.toMatch(/colors\.mapWater/);
    expect(codeOnly).not.toMatch(/customMapStyle/);
    expect(codeOnly).not.toMatch(/PROVIDER_GOOGLE/);
  });

  it('Test 9: react-native-gesture-handler를 사용하지 않는다 (Marker draggable로 충분 — 불필요한 제스처 배선 금지)', () => {
    expect(codeOnly).not.toMatch(/react-native-gesture-handler/);
  });

  it('Test 10: colors.accent와 colors.accentSoft가 핀 스타일 정의에 등장한다', () => {
    expect(codeOnly).toMatch(/\bcolors\.accent\b/);
    expect(codeOnly).toMatch(/\bcolors\.accentSoft\b/);
  });

  it('Test 11: hitSlop이 등장한다 (핀 드래그 히트 영역 44×44pt 확장)', () => {
    expect(indexSource).toMatch(/\bhitSlop\b/);
  });

  it('Test 12: SQL 키워드가 등장하지 않는다 (Pitfall 4 — SQL은 리포지토리에만)', () => {
    expect(codeOnly).not.toMatch(/\bINSERT \b|\bSELECT \b|\bUPDATE \b|\bDELETE \b/);
  });

  it('Test 13: expo-location/expo-image-picker/expo-file-system/expo-crypto를 직접 import하지 않는다 (deps.ts 격리 계약)', () => {
    expect(codeOnly).not.toMatch(/from ['"]expo-location['"]/);
    expect(codeOnly).not.toMatch(/from ['"]expo-image-picker['"]/);
    expect(codeOnly).not.toMatch(/from ['"]expo-file-system['"]/);
    expect(codeOnly).not.toMatch(/from ['"]expo-crypto['"]/);
  });
});

describe('src/app/index.tsx 저장 배선 계약 (Plan 03-10 Task 1)', () => {
  const indexSource = readSource('index.tsx');
  const codeOnly = stripComments(indexSource);

  it('Test 14: commitCheckin 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\bcommitCheckin\b/);
  });

  it('Test 15: 재시도 카운터 패턴(retryCount/attempts/setRetry)이 등장하지 않는다 (Pitfall 4 — 재시도는 리포지토리 소관)', () => {
    expect(codeOnly).not.toMatch(/\bretryCount\b/);
    expect(codeOnly).not.toMatch(/\battempts\b/);
    expect(codeOnly).not.toMatch(/\bsetRetry\b/);
  });

  it('Test 16: Alert.alert가 등장하고 CHECKIN_COPY.unsavedExitAlert 참조가 존재한다', () => {
    expect(indexSource).toMatch(/\bAlert\.alert\b/);
    expect(indexSource).toMatch(/CHECKIN_COPY\.unsavedExitAlert\b/);
  });

  it('Test 17: deleteDraft가 파일 전체에서 등장하지 않는다 (삭제는 commitCheckin 트랜잭션 내부와 loadRecoverableDraft 만료 처리에만 존재)', () => {
    expect(codeOnly).not.toMatch(/\bdeleteDraft\b/);
  });

  it('Test 18: randomUUID 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\brandomUUID\b/);
  });
});

describe('src/app/index.tsx 사진/메모/키보드 배선 계약 (Plan 03-10 Task 2)', () => {
  const indexSource = readSource('index.tsx');
  const codeOnly = stripComments(indexSource);

  it('Test 19: ActionSheetIOS가 등장하고 photos.ts 상수 참조가 존재한다', () => {
    expect(indexSource).toMatch(/\bActionSheetIOS\b/);
    expect(indexSource).toMatch(/\bPHOTO_ACTION_SHEET_OPTIONS\b/);
    expect(indexSource).toMatch(/\bPHOTO_ACTION_SHEET_CANCEL_INDEX\b/);
    expect(indexSource).toMatch(/\bPHOTO_SOURCE_BY_ACTION_SHEET_INDEX\b/);
  });

  it('Test 20: 사진 액션시트 문구 리터럴이 index.tsx에 중복 하드코딩되지 않는다 (photos.ts 상수 소비)', () => {
    expect(codeOnly).not.toContain('사진 촬영');
    expect(codeOnly).not.toContain('앨범에서 선택');
  });

  it('Test 21: pickAndCopyPhoto / updateCheckinNoteAndPhoto 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\bpickAndCopyPhoto\b/);
    expect(indexSource).toMatch(/\bupdateCheckinNoteAndPhoto\b/);
  });

  it('Test 22: KeyboardAvoidingView가 등장하고 behavior="padding"이 지정된다', () => {
    expect(indexSource).toMatch(/\bKeyboardAvoidingView\b/);
    expect(indexSource).toMatch(/behavior="padding"/);
  });

  it('Test 23: Platform.OS가 등장하지 않는다 (iOS 전용 프로젝트, 플랫폼 분기 금지)', () => {
    expect(codeOnly).not.toMatch(/Platform\.OS/);
  });
});

describe('src/app/index.tsx 드래프트 복구 배선 계약 (Plan 03-10 Task 3)', () => {
  const indexSource = readSource('index.tsx');
  const codeOnly = stripComments(indexSource);

  it('Test 24: loadRecoverableDraft 식별자가 등장한다', () => {
    expect(indexSource).toMatch(/\bloadRecoverableDraft\b/);
  });

  it('Test 25: RESTORE_DRAFT 이벤트 dispatch가 등장한다', () => {
    expect(indexSource).toMatch(/type:\s*'RESTORE_DRAFT'/);
  });

  it('Test 26: stripComments 적용 후 복구 확인 다이얼로그 문구(이어서/계속하시겠)가 등장하지 않는다', () => {
    expect(codeOnly).not.toMatch(/이어서/);
    expect(codeOnly).not.toMatch(/계속하시겠/);
  });

  it('Test 27: loadRecoverableDraft를 호출하는 useEffect 블록 안에 requestLocationPermission/resolveCheckinLocation이 등장하지 않는다', () => {
    // 앵커를 "let isMounted = true;" 직후 loadRecoverableDraft 호출로 좁혀, 그 앞의
    // 다른 useEffect 블록들(같은 파일 안의 여러 "useEffect(() => {" 시작점)을
    // 실수로 포함하지 않게 한다.
    const match = codeOnly.match(
      /let isMounted = true;\s*loadRecoverableDraft[\s\S]*?\}, \[db\]\);/
    );
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).not.toMatch(/requestLocationPermission/);
    expect(block).not.toMatch(/resolveCheckinLocation/);
  });

  it('Test 28: isMounted 가드가 존재한다', () => {
    expect(indexSource).toMatch(/\bisMounted\b/);
  });
});

describe('src/app/index.tsx 내 위치 재센터링 버튼 배선 계약', () => {
  const indexSource = readSource('index.tsx');
  const codeOnly = stripComments(indexSource);

  it('Test 29: handleRecenterPress 핸들러와 접근성 라벨이 등장한다', () => {
    expect(indexSource).toMatch(/\bhandleRecenterPress\b/);
    expect(indexSource).toMatch(/accessibilityLabel="현재 위치로 이동"/);
  });

  it('Test 30: 재센터링 버튼이 requestLocationPermission → getCurrentPositionAsync → animateToRegion 순서로 배선된다', () => {
    const match = codeOnly.match(/const handleRecenterPress[\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/requestLocationPermission/);
    expect(block).toMatch(/getCurrentPositionAsync/);
    expect(block).toMatch(/animateToRegion/);
  });

  it('Test 31: 재센터링 버튼은 accent 컬러를 쓰지 않는다 (DESIGN.md 6개 승인 용도 밖 — 중립색 사용)', () => {
    const match = codeOnly.match(/recenterButton:\s*\{[\s\S]*?\n  \},/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).not.toMatch(/colors\.accent\b/);
  });

  it('Test 32: expo-location을 직접 import하지 않고 checkin/deps의 defaultLocationDeps를 통해서만 접근한다', () => {
    expect(codeOnly).not.toMatch(/from ['"]expo-location['"]/);
    expect(indexSource).toMatch(/\bdefaultLocationDeps\b/);
  });
});

describe('src/app/index.tsx 나침반 모드 토글 배선 계약 (재센터링 버튼 연속 탭)', () => {
  const indexSource = readSource('index.tsx');
  const codeOnly = stripComments(indexSource);

  it('Test 33: orientationMode 상태가 useState로 선언되고 초기값이 north다', () => {
    expect(indexSource).toMatch(/const \[orientationMode, setOrientationMode\] = useState/);
    expect(indexSource).toMatch(/useState<'north' \| 'compass'>\('north'\)/);
  });

  it('Test 34: watchHeadingAsync가 defaultLocationDeps를 통해서만 호출되고 expo-location을 직접 import하지 않는다', () => {
    expect(indexSource).toMatch(/defaultLocationDeps\.watchHeadingAsync/);
    expect(codeOnly).not.toMatch(/from ['"]expo-location['"]/);
  });

  it('Test 35: 나침반 구독(headingSubscriptionRef)이 모드 전환 시와 언마운트 시 최소 2곳에서 remove된다', () => {
    expect(indexSource).toMatch(/\bheadingSubscriptionRef\b/);
    const removeCalls = codeOnly.match(/headingSubscriptionRef\.current\?\.remove\(\)/g) ?? [];
    expect(removeCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('Test 36: 재센터링 버튼 아이콘이 모드에 따라 location.fill과 location.north.line.fill 사이에서 전환된다', () => {
    expect(indexSource).toMatch(/location\.fill/);
    expect(indexSource).toMatch(/location\.north\.line\.fill/);
  });

  it('Test 37: 재센터링 버튼 아이콘은 모드와 무관하게 colors.textMuted를 쓰고 accent는 쓰지 않는다', () => {
    const match = codeOnly.match(/<SymbolView[\s\S]*?\/>/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/colors\.textMuted/);
    expect(block).not.toMatch(/colors\.accent\b/);
  });

  it('Test 38: handleRecenterPress는 여전히 permission → getCurrentPositionAsync → animateToRegion 순서를 유지한 뒤 모드를 전환한다 (deps 배열은 [] 유지)', () => {
    const match = codeOnly.match(/const handleRecenterPress[\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/requestLocationPermission/);
    expect(block).toMatch(/getCurrentPositionAsync/);
    expect(block).toMatch(/animateToRegion/);
    expect(block).toMatch(/orientationModeRef/);
  });

  it('Test 39: react-native-gesture-handler를 쓰지 않는다 (길게 누르기 대신 연속 탭 토글로 구현)', () => {
    expect(codeOnly).not.toMatch(/react-native-gesture-handler/);
  });

  it('Test 40: 구글맵 실동작 재현 — 첫 탭은 나침반 모드로 바로 전환하지 않고 north로만 진입한다 (hasCenteredOnceRef 가드)', () => {
    const match = codeOnly.match(/const handleRecenterPress[\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/hasCenteredOnceRef/);
    // 가드가 있어야: "아직 한 번도 활성화 안 됐으면 무조건 'north'" 형태의 삼항식이
    // orientationModeRef를 직접 토글하는 삼항식보다 먼저 온다.
    expect(block).toMatch(/!hasCenteredOnceRef\.current\s*\n?\s*\?\s*'north'/);
  });
});

describe('src/app/index.tsx "완료" 버튼 배선 계약 (2026-08-28 추가 — 사진/메모 저장 확인 CTA)', () => {
  const indexSource = readSource('index.tsx');
  const codeOnly = stripComments(indexSource);

  it('Test 41: handleFinishCheckin이 지도 탭과 CheckinActionCard의 onComplete 양쪽에 배선된다', () => {
    expect(codeOnly).toMatch(/const handleFinishCheckin = useCallback/);
    expect(codeOnly).toMatch(/onPress=\{handleFinishCheckin\}/);
    expect(codeOnly).toMatch(/onComplete=\{handleFinishCheckin\}/);
    // 이전 이름(handleMapPress)이 리네임 후에도 잔존하지 않는다.
    expect(codeOnly).not.toMatch(/\bhandleMapPress\b/);
  });

  it('Test 42: handleFinishCheckin은 SAVED phase 가드 뒤에 flushNoteAndPhoto와 DISMISS dispatch를 그대로 유지한다', () => {
    const match = codeOnly.match(/const handleFinishCheckin[\s\S]*?\n  \}, \[flushNoteAndPhoto\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/phase !== 'SAVED'/);
    expect(block).toMatch(/flushNoteAndPhoto\(\)/);
    expect(block).toMatch(/dispatch\(\{ type: 'DISMISS' \}\)/);
  });
});
