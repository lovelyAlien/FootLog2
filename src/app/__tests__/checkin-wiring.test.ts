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
const TODAY_SCREEN_PATH = path.join('(tabs)', 'index.tsx');

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(APP_DIR, relativePath), 'utf-8');
}

describe('src/app/(tabs)/index.tsx 체크인 배선 계약 (Plan 03-09)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
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

  it('Test 10 (2026-08-31 갱신): colors.pin과 colors.pinSoft가 핀 스타일 정의에 등장한다 (accent는 UI 크롬 전용으로 분리됨)', () => {
    expect(codeOnly).toMatch(/\bcolors\.pin\b/);
    expect(codeOnly).toMatch(/\bcolors\.pinSoft\b/);
    // 핀 스타일이 accent/accentSoft로 되돌아가는 회귀를 막는다.
    expect(codeOnly).not.toMatch(/pinConfident:\s*\{[^}]*colors\.accent\b/s);
    expect(codeOnly).not.toMatch(/pinSaved:\s*\{[^}]*colors\.accentSoft\b/s);
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

describe('src/app/(tabs)/index.tsx 저장 배선 계약 (Plan 03-10 Task 1)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
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

describe('src/app/(tabs)/index.tsx 사진/메모/키보드 배선 계약 (Plan 03-10 Task 2)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
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

describe('src/app/(tabs)/index.tsx 드래프트 복구 배선 계약 (Plan 03-10 Task 3)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
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

describe('src/app/(tabs)/index.tsx 내 위치 재센터링 버튼 배선 계약', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);

  it('Test 29: handleRecenterPress 핸들러와 접근성 라벨이 등장한다', () => {
    expect(indexSource).toMatch(/\bhandleRecenterPress\b/);
    expect(indexSource).toMatch(/accessibilityLabel="현재 위치로 이동"/);
  });

  it('Test 30: 재센터링 버튼이 requestLocationPermission → resolveInstantPosition → animateToRegion 순서로 배선된다', () => {
    const match = codeOnly.match(/const handleRecenterPress[\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/requestLocationPermission/);
    expect(block).toMatch(/resolveInstantPosition/);
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

describe('src/app/(tabs)/index.tsx 나침반 모드 토글 배선 계약 (재센터링 버튼 연속 탭)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
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

  it('Test 38: handleRecenterPress는 여전히 permission → resolveInstantPosition → animateToRegion 순서를 유지한 뒤 모드를 전환한다 (deps 배열은 [] 유지)', () => {
    const match = codeOnly.match(/const handleRecenterPress[\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/requestLocationPermission/);
    expect(block).toMatch(/resolveInstantPosition/);
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

describe('src/app/(tabs)/index.tsx "완료" 버튼 배선 계약 (2026-08-28 추가 — 사진/메모 저장 확인 CTA)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
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

describe('src/app/(tabs)/index.tsx 체크인 버튼 크로스페이드 회귀 가드 (Plan 03-12)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);

  it('Test 43: 크로스페이드 effect가 버튼 마운트 여부(showActionCard)에 의존하고, 마운트 안 됐을 때 early return한다', () => {
    expect(codeOnly).toMatch(/\[\s*showActionCard,\s*isCapturing,\s*buttonContentOpacity\s*\]/);
    expect(codeOnly).toMatch(/if \(showActionCard\)\s*(\{[\s\S]{0,40}?)?return;/);
  });

  it('Test 44 (03-HUMAN-UAT.md gap — SAVED→IDLE에서 라벨이 사라지던 의존성 배열 형태): 옛 의존성 배열 [isCapturing, buttonContentOpacity]가 재등장하지 않는다', () => {
    expect(codeOnly).not.toMatch(/\[\s*isCapturing,\s*buttonContentOpacity\s*\]/);
  });

  it('Test 45: cleanup이 애니메이션을 멈추고 값을 1로 park한다', () => {
    expect(codeOnly).toMatch(/buttonContentOpacity\.setValue\(1\)/);
    expect(codeOnly).toMatch(/\.stop\(\)/);
  });

  it('Test 46: 크로스페이드 자체는 제거되지 않았다 (180ms, native driver 유지)', () => {
    expect(codeOnly).toMatch(/Animated\.timing\([\s\S]*?duration: motion\.saveStateCrossfadeMs/);
    expect(codeOnly).toMatch(/useNativeDriver: true/);
  });
});

describe('src/app/(tabs)/index.tsx 재센터 버튼 수동 팬 리셋 배선 계약 (구글맵 "팔로우 해제" 재현)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);

  it('Test 47: MapView에 onPanDrag가 handlePanDrag로 배선된다', () => {
    expect(codeOnly).toMatch(/<MapView[\s\S]*?onPanDrag=\{handlePanDrag\}[\s\S]*?>/);
  });

  it('Test 48 (회귀 가드 — 수동 팬 후 재센터 탭이 나침반으로 바로 점프하던 버그): handlePanDrag가 hasCenteredOnceRef를 false로 리셋한다', () => {
    const match = codeOnly.match(/const handlePanDrag = useCallback\([\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/hasCenteredOnceRef\.current = false/);
  });

  it('Test 49: handlePanDrag가 나침반 구독을 정리하고(remove) orientationMode를 north로 되돌린다', () => {
    const match = codeOnly.match(/const handlePanDrag = useCallback\([\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/headingSubscriptionRef\.current\?\.remove\(\)/);
    expect(block).toMatch(/headingSubscriptionRef\.current = null/);
    expect(block).toMatch(/setOrientationMode\('north'\)/);
  });

  it('Test 50: handlePanDrag의 useCallback deps 배열은 []로 고정된다 (배선 시점 리렌더 방지, 기존 패턴과 동일)', () => {
    expect(codeOnly).toMatch(/const handlePanDrag = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[\]\);/);
  });
});

describe('src/app/(tabs)/index.tsx 지도 준비 대기 배선 계약 (콜드 부팅 첫 탭 무반응 회귀 가드)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);

  it('Test 51: MapView에 onMapReady가 handleMapReady로 배선된다', () => {
    expect(codeOnly).toMatch(/<MapView[\s\S]*?onMapReady=\{handleMapReady\}[\s\S]*?>/);
  });

  it('Test 52: handleMapReady가 isMapReadyRef를 true로 세팅하고 대기 중인 콜백들을 모두 resolve한다', () => {
    const match = codeOnly.match(/const handleMapReady = useCallback\([\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/isMapReadyRef\.current = true/);
    expect(block).toMatch(/waiters\.forEach\(\(resolve\) => resolve\(\)\)/);
  });

  it('Test 53 (회귀 가드 — 콜드 부팅 직후 첫 재센터 탭이 무반응이던 버그): 지도 카메라를 옮기는 6개 지점(드래프트 복구/최초 진입 내 위치 확대·onRefine/재센터·onRefine/체크인 캡처) 모두 animateToRegion 앞에서 waitForMapReady를 await한다', () => {
    // 리뷰 발견(2026-08-30) 이후: onRefine(백그라운드 GPS 보정) 두 곳도 이제
    // waitForMapReady 게이트를 거치므로 4개에서 6개로 늘었다 — 이전에는 이 두 곳이
    // 게이트를 우회해 콜드 부팅 중 조용히 no-op될 수 있었다.
    const animateToRegionCalls = codeOnly.match(/await waitForMapReady\(\);\s*\n\s*(if \([^\n]*\) return;\s*\n\s*)?mapRef\.current\?\.animateToRegion\(/g) ?? [];
    expect(animateToRegionCalls.length).toBe(6);
  });

  it('Test 54: waitForMapReady는 이미 준비됐으면 즉시 resolve하고, 아니면 handleMapReady가 resolve할 때까지 대기한다', () => {
    const match = codeOnly.match(/const waitForMapReady = useCallback\([\s\S]*?\n  \}, \[\]\);/);
    expect(match).not.toBeNull();
    const block = match ? match[0] : '';
    expect(block).toMatch(/if \(isMapReadyRef\.current\) return Promise\.resolve\(\);/);
    expect(block).toMatch(/mapReadyWaitersRef\.current\.push\(resolve\)/);
  });
});

describe('src/app/(tabs)/index.tsx 나침반 모드 3D 틸트 배선 계약 (구글맵 나침반 모드 재현)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);

  it('Test 55: 나침반 모드 진입 시 COMPASS_PITCH_DEGREES로 지도를 기울인다', () => {
    expect(codeOnly).toMatch(/const COMPASS_PITCH_DEGREES = 45;/);
    expect(codeOnly).toMatch(/animateCamera\(\{ pitch: COMPASS_PITCH_DEGREES \}\)/);
  });

  it('Test 56: 나침반 모드에서 빠져나올 때(재센터 버튼 north 복귀, 수동 팬 리셋) heading과 pitch를 모두 0으로 되돌린다', () => {
    const resetCalls = codeOnly.match(/animateCamera\(\{ heading: 0, pitch: 0 \}\)/g) ?? [];
    expect(resetCalls.length).toBeGreaterThanOrEqual(2);
  });
});

describe('src/app/(tabs)/index.tsx resolveInstantPosition 배선 계약 (구글맵처럼 캐시 우선, 딜레이/무반응 회귀 가드 — 재센터 버튼과 최초 진입 확대가 공유)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);
  const resolveBlockMatch = codeOnly.match(
    /async function resolveInstantPosition\([\s\S]*?\n\}/
  );
  const resolveBlock = resolveBlockMatch ? resolveBlockMatch[0] : '';

  it('Test 57: resolveInstantPosition이 존재하고 정규식으로 추출됐다 (이후 테스트들의 전제 조건)', () => {
    expect(resolveBlockMatch).not.toBeNull();
  });

  it('Test 58 (회귀 가드 — 매번 새 GPS fix를 기다려 딜레이가 들쭉날쭉하던 문제): getLastKnownPositionAsync를 getCurrentPositionAsync보다 먼저 시도한다', () => {
    const firstLastKnownIndex = resolveBlock.indexOf('getLastKnownPositionAsync');
    const firstCurrentPositionIndex = resolveBlock.indexOf('getCurrentPositionAsync');
    expect(firstLastKnownIndex).toBeGreaterThan(-1);
    expect(firstCurrentPositionIndex).toBeGreaterThan(-1);
    expect(firstLastKnownIndex).toBeLessThan(firstCurrentPositionIndex);
  });

  it('Test 59: 신선한 캐시 조회는 LAST_KNOWN_MAX_AGE_MS(체크인 폴백 체인과 동일한 신선도 기준)를 쓴다', () => {
    expect(resolveBlock).toMatch(
      /getLastKnownPositionAsync\(\{\s*maxAge:\s*LAST_KNOWN_MAX_AGE_MS\s*\}\)/
    );
  });

  it('Test 60 (회귀 가드 — 캐시 없을 때 GPS가 느리면 무한정 대기하던 문제): 캐시가 없는 경로는 GPS와 CAPTURE_TIMEOUT_MS 타이머를 Promise.race로 경합시킨다', () => {
    expect(resolveBlock).toMatch(/Promise\.race\(\[gpsOutcome, timerOutcome\]\)/);
    expect(resolveBlock).toMatch(/setTimeout\(\(\) => resolve\(\{ tag: 'timeout' \}\), CAPTURE_TIMEOUT_MS\)/);
  });

  it('Test 61 (회귀 가드 — 버튼이 완전히 무반응이던 문제): GPS 타임아웃/에러 시 나이 제한 없는 OS 캐시를 마지막 수단으로 시도한다', () => {
    expect(resolveBlock).toMatch(/getLastKnownPositionAsync\(\)\.catch\(\(\) => null\)/);
  });

  it('Test 62: handleRecenterPress와 드래프트 복구 effect 둘 다 resolveInstantPosition을 호출한다 (중복 구현 없이 공유)', () => {
    // 정의부(async function resolveInstantPosition() {...}) 1회 + 실제 호출 2곳(재센터, 최초 진입) = 3
    const occurrences = codeOnly.match(/resolveInstantPosition\(/g) ?? [];
    expect(occurrences.length).toBe(3);
    const callSites = codeOnly.match(/const coords = await resolveInstantPosition\(\(refinedCoords\) => \{/g) ?? [];
    expect(callSites.length).toBe(2);
  });

  it('Test 68 (회귀 가드 — 재센터 버튼을 여러 번 눌러야 실제 위치로 수렴하던 문제): resolveInstantPosition은 캐시를 썼을 때만 onRefine으로 백그라운드 GPS 보정 결과를 넘긴다', () => {
    expect(resolveBlock).toMatch(/if \(onRefine\) \{/);
    expect(resolveBlock).toMatch(/\.then\(\(position\) => onRefine\(position\.coords\)\)/);
    // onRefine 호출은 freshCache 분기 안에 있다 — fresh GPS 경로(캐시 없음)는
    // 이미 정확도가 나아질 대상이 없으므로 다시 부르지 않는다.
    const freshCacheBranchMatch = resolveBlock.match(/if \(freshCache\) \{[\s\S]*?\n  \}/);
    expect(freshCacheBranchMatch).not.toBeNull();
    expect(freshCacheBranchMatch ? freshCacheBranchMatch[0] : '').toMatch(/onRefine/);
  });

  it('Test 63: handleRecenterPress는 항상 MAP_REGION_DELTA로 재확대한다 (구글맵처럼 팬/줌아웃 상태와 무관하게 항상 내 위치 기준으로 확대)', () => {
    const recenterMatch = codeOnly.match(/const handleRecenterPress = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[\]\);/);
    expect(recenterMatch).not.toBeNull();
    const block = recenterMatch ? recenterMatch[0] : '';
    expect(block).toMatch(/latitudeDelta: MAP_REGION_DELTA/);
    expect(block).toMatch(/longitudeDelta: MAP_REGION_DELTA/);
  });

  it('Test 67 (회귀 가드 — animateToRegion과 animateCamera가 거의 동시에 호출되면 iOS가 위치 이동 애니메이션을 중간에 취소하고 각도만 반영하던 네이티브 경합 문제): handleRecenterPress가 animateToRegion에 RECENTER_ANIMATION_MS를 명시하고, 그만큼 await한 뒤에야 이어지는 animateCamera(heading/pitch)를 호출한다', () => {
    const recenterMatch = codeOnly.match(/const handleRecenterPress = useCallback\(\(\) => \{[\s\S]*?\n  \}, \[\]\);/);
    expect(recenterMatch).not.toBeNull();
    const block = recenterMatch ? recenterMatch[0] : '';
    expect(codeOnly).toMatch(/const RECENTER_ANIMATION_MS = 500;/);
    expect(block).toMatch(/animateToRegion\(\s*\{[\s\S]*?\},\s*\n\s*RECENTER_ANIMATION_MS\s*\n\s*\);/);
    expect(block).toMatch(/await new Promise\(\(resolve\) => setTimeout\(resolve, RECENTER_ANIMATION_MS\)\);/);
    // await 지점이 animateToRegion 호출보다 뒤에, nextMode 결정(따라서 이어지는
    // animateCamera 호출들)보다는 앞에 와야 한다.
    const animateToRegionIndex = block.indexOf('animateToRegion(');
    const awaitTimeoutIndex = block.indexOf('await new Promise((resolve) => setTimeout(resolve, RECENTER_ANIMATION_MS));');
    const nextModeIndex = block.indexOf("const nextMode: 'north' | 'compass'");
    expect(animateToRegionIndex).toBeGreaterThan(-1);
    expect(awaitTimeoutIndex).toBeGreaterThan(animateToRegionIndex);
    expect(nextModeIndex).toBeGreaterThan(awaitTimeoutIndex);
  });
});

describe('src/app/(tabs)/index.tsx 최초 진입 시 내 위치 기준 확대 배선 계약 (네이버지도/구글맵처럼 전국 축소 뷰 대신 내 위치로 시작)', () => {
  const indexSource = readSource(TODAY_SCREEN_PATH);
  const codeOnly = stripComments(indexSource);
  const draftEffectMatch = codeOnly.match(
    /useEffect\(\(\) => \{\s*let isMounted = true;\s*loadRecoverableDraft\([\s\S]*?\n  \}, \[db\]\);/
  );
  const draftEffectBlock = draftEffectMatch ? draftEffectMatch[0] : '';

  it('Test 64: 드래프트 복구 effect가 정규식으로 추출됐다 (이후 테스트들의 전제 조건)', () => {
    expect(draftEffectMatch).not.toBeNull();
  });

  it('Test 65 (회귀 가드 — 항상 전국 축소 뷰로 시작하던 문제): 드래프트가 없으면(draft !== null 분기 밖) fetchLocationPermission으로 권한을 확인한 뒤 resolveInstantPosition으로 내 위치를 구해 animateToRegion한다', () => {
    expect(draftEffectBlock).toMatch(/if \(draft !== null\) \{/);
    expect(draftEffectBlock).toMatch(/const permission = await fetchLocationPermission\(\);/);
    expect(draftEffectBlock).toMatch(/if \(!isMounted \|\| !permission\.granted\) return;/);
    expect(draftEffectBlock).toMatch(/const coords = await resolveInstantPosition\(\(refinedCoords\) => \{/);
  });

  it('Test 66: 이 경로는 requestLocationPermission(프롬프트를 띄울 수 있는 호출)을 쓰지 않는다 — 권한 요청은 여전히 "체크인" 첫 탭이 소유한다', () => {
    expect(draftEffectBlock).not.toMatch(/requestLocationPermission/);
    expect(draftEffectBlock).toMatch(/fetchLocationPermission/);
  });
});
