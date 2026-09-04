plugins {
	kotlin("jvm") version "2.3.21"
	kotlin("plugin.spring") version "2.3.21"
	id("org.springframework.boot") version "4.1.1"
	id("io.spring.dependency-management") version "1.1.7"
	kotlin("plugin.jpa") version "2.3.21"
}

group = "com.footlog"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion = JavaLanguageVersion.of(21)
	}
}

repositories {
	mavenCentral()
}

dependencies {
	implementation("org.springframework.boot:spring-boot-starter-actuator")
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-flyway")
	// Boot 4.1부터 RestClient.Builder 자동설정이 별도 모듈로 분리됐다(10-RESEARCH.md Pitfall 5,
	// 09-05의 -restclient-test 주석과 같은 계열) — 카카오 토큰/사용자정보 엔드포인트 호출에 필요.
	implementation("org.springframework.boot:spring-boot-starter-restclient")
	implementation("org.springframework.boot:spring-boot-starter-security")
	// resource-server 스타터 하나가 spring-security-oauth2-jose + com.nimbusds:nimbus-jose-jwt를
	// 전이적으로 가져와 NimbusJwtEncoder/NimbusJwtDecoder로 자체 JWT를 발급·검증할 수 있게 한다
	// (외부 IdP 토큰만 검증하는 용도가 아니다) — 그래서 서드파티 JWT 라이브러리가 필요 없다
	// (안티패턴 상세는 10-RESEARCH.md 참고).
	// Boot 4 아티팩트명 주의: spring-boot-starter-oauth2-resource-server가 아니라
	// spring-boot-starter-security-oauth2-resource-server다(Boot 3과 다름, flyway 명명 변경과 동일 계열).
	implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-webmvc")
	implementation("org.flywaydb:flyway-database-postgresql")
	implementation("org.jetbrains.kotlin:kotlin-reflect")
	implementation("tools.jackson.module:jackson-module-kotlin")
	developmentOnly("org.springframework.boot:spring-boot-docker-compose")
	runtimeOnly("org.postgresql:postgresql")
	testImplementation("org.springframework.boot:spring-boot-starter-actuator-test")
	testImplementation("org.springframework.boot:spring-boot-starter-data-jpa-test")
	testImplementation("org.springframework.boot:spring-boot-starter-flyway-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-test")
	testImplementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server-test")
	testImplementation("org.springframework.boot:spring-boot-starter-validation-test")
	testImplementation("org.springframework.boot:spring-boot-starter-webmvc-test")
	// TestRestTemplate(org.springframework.boot.resttestclient)의 자동설정이 요구하는
	// RestTemplateBuilder(org.springframework.boot.restclient)를 제공한다 — Boot 4.1부터
	// REST 클라이언트 지원이 별도 모듈로 분리되어 webmvc-test 스타터만으로는 부족하다
	// (09-05 실행 중 발견, ./gradlew dependencies로 좌표 존재 확인 후 추가).
	testImplementation("org.springframework.boot:spring-boot-starter-restclient-test")
	testImplementation("org.springframework.boot:spring-boot-testcontainers")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testImplementation("org.testcontainers:testcontainers-junit-jupiter")
	testImplementation("org.testcontainers:testcontainers-postgresql")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

kotlin {
	compilerOptions {
		freeCompilerArgs.addAll("-Xjsr305=strict", "-Xannotation-default-target=param-property")
	}
}

allOpen {
	annotation("jakarta.persistence.Entity")
	annotation("jakarta.persistence.MappedSuperclass")
	annotation("jakarta.persistence.Embeddable")
}

tasks.withType<Test> {
	useJUnitPlatform()
}
