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
