/**
 * @jest-environment node
 */
// src/app/__tests__/dev-login-wiring.test.ts
// 10-07-PLAN.md Task 1 — app.config.js 플러그인 계약 + D-16 스코프 경계 fence +
// 카카오 로그인 오케스트레이션/화면 배선 계약. infoPlist.test.ts/settings-wiring.test.ts와
// 동일 기법(fs.readFileSync 정적 소스 분석, RN 렌더 불필요)을 그대로 재사용한다.
import fs from 'fs';
import path from 'path';
import { stripComments } from '../../test-utils/stripComments';

const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const SRC_DIR = path.join(__dirname, '..', '..');
const APP_DIR = path.join(__dirname, '..');
const APP_CONFIG_PATH = path.join(REPO_ROOT, 'app.config.js');
const APP_JSON_PATH = path.join(REPO_ROOT, 'app.json');

// 카카오 로그인 네이티브 SDK 패키지 이름 — join으로 조립해 이 테스트 파일 소스 자체에
// 연속된 리터럴 문자열로 나타나지 않게 한다. acceptance criteria의 grep(`src/` 전체
// 스캔, "src/auth/kakaoLogin.ts가 이 패키지를 import하는 유일한 파일"을 검증)이 이
// 테스트 파일 자신을 위반 파일로 오탐하는 것을 막는다(10-05-SUMMARY.md에 기록된 동일
// 계열 함정과 같은 근본 원인).
const KAKAO_SDK_PACKAGE_NAME = ['@react-native-seoul', 'kakao-login'].join('/');

function readAppJson(): any {
  return JSON.parse(fs.readFileSync(APP_JSON_PATH, 'utf-8'));
}

// src/ 하위 모든 .ts/.tsx 파일을 재귀 수집한다 — foundation-wiring.test.ts의
// collectSourceFiles와 동일 기법.
function collectSourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  let files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files = files.concat(collectSourceFiles(fullPath));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

describe('app.config.js — 카카오 config plugin 주입 계약', () => {
  const originalEnv = process.env.KAKAO_NATIVE_APP_KEY;
  const appJson = readAppJson();

  afterEach(() => {
    process.env.KAKAO_NATIVE_APP_KEY = originalEnv;
    jest.resetModules();
  });

  it('Test 1: app.config.js가 존재하고, app.json 내용을 config 인자로 넘겨 실행하면 plugins 배열에 카카오 로그인 config plugin 항목이 포함된다', () => {
    expect(fs.existsSync(APP_CONFIG_PATH)).toBe(true);
    process.env.KAKAO_NATIVE_APP_KEY = 'dummy-test-key';
    jest.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const appConfigFn = require(APP_CONFIG_PATH);
    const result = appConfigFn({ config: appJson.expo });
    const kakaoPluginEntry = result.plugins.find(
      (entry: unknown) => Array.isArray(entry) && entry[0] === KAKAO_SDK_PACKAGE_NAME
    );
    expect(kakaoPluginEntry).toBeDefined();
    expect(kakaoPluginEntry[1]).toMatchObject({ kakaoAppKey: 'dummy-test-key' });
  });

  it('Test 2: 반환된 설정의 ios.infoPlist에 Phase 2 권한 문구 3종이 app.json 원본과 동일하게 보존된다', () => {
    process.env.KAKAO_NATIVE_APP_KEY = 'dummy-test-key';
    jest.resetModules();
    const appConfigFn = require(APP_CONFIG_PATH);
    const result = appConfigFn({ config: appJson.expo });
    expect(result.ios.infoPlist.NSLocationWhenInUseUsageDescription).toBe(
      appJson.expo.ios.infoPlist.NSLocationWhenInUseUsageDescription
    );
    expect(result.ios.infoPlist.NSCameraUsageDescription).toBe(
      appJson.expo.ios.infoPlist.NSCameraUsageDescription
    );
    expect(result.ios.infoPlist.NSPhotoLibraryUsageDescription).toBe(
      appJson.expo.ios.infoPlist.NSPhotoLibraryUsageDescription
    );
  });

  it('Test 3: 반환된 설정의 plugins에 app.json 원본 5개 항목이 전부 그대로 남아 있다', () => {
    process.env.KAKAO_NATIVE_APP_KEY = 'dummy-test-key';
    jest.resetModules();
    const appConfigFn = require(APP_CONFIG_PATH);
    const result = appConfigFn({ config: appJson.expo });
    expect(appJson.expo.plugins.length).toBe(5);
    for (const originalEntry of appJson.expo.plugins) {
      const serializedOriginal = JSON.stringify(originalEntry);
      const stillPresent = result.plugins.some(
        (entry: unknown) => JSON.stringify(entry) === serializedOriginal
      );
      expect(stillPresent).toBe(true);
    }
  });

  it('Test 4: KAKAO_NATIVE_APP_KEY가 비어 있으면 app.config.js 실행이 throw한다', () => {
    delete process.env.KAKAO_NATIVE_APP_KEY;
    jest.resetModules();
    const appConfigFn = require(APP_CONFIG_PATH);
    expect(() => appConfigFn({ config: appJson.expo })).toThrow();
  });

  it('Test 5: app.config.js 소스에 32자 이상 연속 hex/base64 형태 문자열이 없다(앱 키 하드코딩 금지)', () => {
    const source = fs.readFileSync(APP_CONFIG_PATH, 'utf-8');
    const suspiciousLiteral = /['"][A-Za-z0-9+/_-]{32,}['"]/;
    expect(source).not.toMatch(suspiciousLiteral);
  });
});

describe('D-16 스코프 경계 fence — 개발자 검증 화면은 1단계 앱 UI 어디에도 노출되지 않는다', () => {
  it('Test 6: (tabs)/ 아래 모든 .tsx 파일과 settings/SettingsScreen.tsx 소스에 dev-login 문자열이 등장하지 않는다', () => {
    const tabsDir = path.join(APP_DIR, '(tabs)');
    const offenders: string[] = [];
    for (const filePath of collectSourceFiles(tabsDir)) {
      const source = fs.readFileSync(filePath, 'utf-8');
      if (/dev-login/.test(source)) {
        offenders.push(path.relative(SRC_DIR, filePath));
      }
    }
    const settingsScreenPath = path.join(SRC_DIR, 'settings', 'SettingsScreen.tsx');
    const settingsScreenSource = fs.readFileSync(settingsScreenPath, 'utf-8');
    if (/dev-login/.test(settingsScreenSource)) {
      offenders.push(path.relative(SRC_DIR, settingsScreenPath));
    }
    expect(offenders).toEqual([]);
  });

  it('Test 7: src/app/dev-login.tsx가 (tabs)나 settings로 라우팅하지 않는다', () => {
    const devLoginSource = fs.readFileSync(path.join(APP_DIR, 'dev-login.tsx'), 'utf-8');
    const codeOnly = stripComments(devLoginSource);
    expect(codeOnly).not.toMatch(/router\.(push|replace)\(['"][^'"]*\(tabs\)/);
    expect(codeOnly).not.toMatch(/router\.(push|replace)\(['"][^'"]*settings/);
  });
});

describe('src/app/dev-login.tsx 화면 계약', () => {
  const devLoginSource = fs.readFileSync(path.join(APP_DIR, 'dev-login.tsx'), 'utf-8');
  const codeOnly = stripComments(devLoginSource);

  it('Test 8: hex 컬러 리터럴이 없고 @/theme/tokens(또는 상대 경로 ../theme/tokens)에서 import한다', () => {
    const hexMatches = codeOnly.match(/#[0-9A-Fa-f]{3,6}\b/g) ?? [];
    expect(hexMatches.length).toBe(0);
    expect(codeOnly).toMatch(/from ['"](\.\.\/)*(@\/)?(src\/)?theme\/tokens['"]/);
  });

  it('Test 9: src/auth/kakaoLogin.ts가 카카오 로그인 네이티브 SDK 패키지를 import하는 src/ 내 유일한 파일이다', () => {
    const kakaoSdkImportPattern = new RegExp(
      KAKAO_SDK_PACKAGE_NAME.replace(/[/-]/g, (char) => `\\${char}`)
    );
    const offenders: string[] = [];
    for (const filePath of collectSourceFiles(SRC_DIR)) {
      // 이 테스트 파일 자신은 스캔 대상에서 제외한다 — 위 KAKAO_SDK_PACKAGE_NAME이
      // join으로 조립돼 이 파일 소스에 연속 리터럴로 나타나지 않아도, 향후 리팩터로
      // 다시 등장할 가능성을 원천적으로 차단한다.
      if (filePath === path.join(__dirname, 'dev-login-wiring.test.ts')) continue;
      const source = fs.readFileSync(filePath, 'utf-8');
      if (kakaoSdkImportPattern.test(source)) {
        offenders.push(path.relative(SRC_DIR, filePath));
      }
    }
    expect(offenders).toEqual([path.join('auth', 'kakaoLogin.ts')]);
  });

  it('Test 10: src/auth/kakaoLogin.ts 소스(주석 제거 후)에 refreshToken/idToken이 등장하지 않는다(D-14)', () => {
    const kakaoLoginSource = fs.readFileSync(
      path.join(SRC_DIR, 'auth', 'kakaoLogin.ts'),
      'utf-8'
    );
    const kakaoLoginCodeOnly = stripComments(kakaoLoginSource);
    expect(kakaoLoginCodeOnly).not.toMatch(/refreshToken/);
    expect(kakaoLoginCodeOnly).not.toMatch(/idToken/);
  });

  it('Test 11: devLoginContent에서 문구를 가져오고, 문자열 리터럴을 직접 렌더하지 않는다', () => {
    expect(codeOnly).toMatch(/from ['"](\.\.\/)*(@\/)?(src\/)?auth\/devLoginContent['"]/);
    expect(codeOnly).toMatch(/DEV_LOGIN_COPY/);
    // <Text>태그에 직접 한글 문자열 리터럴을 렌더하지 않는다는 것을 느슨하게 확인 —
    // <Text>{'한글'}</Text> 또는 <Text>한글</Text> 형태가 없는지 본다.
    expect(codeOnly).not.toMatch(/<Text[^>]*>\s*['"][가-힣]/);
  });

  it('Test 12: AuthError의 세 kind 값이 모두 등장한다(D-15 에러 분기)', () => {
    expect(codeOnly).toMatch(/['"]network['"]/);
    expect(codeOnly).toMatch(/['"]rejected['"]/);
    expect(codeOnly).toMatch(/['"]no-session['"]/);
  });
});
