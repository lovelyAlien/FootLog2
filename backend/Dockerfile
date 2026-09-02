# syntax=docker/dockerfile:1
# Stage 1: Gradle 빌드(bootJar 생성) — 검증된 wrapper 버전과 맞춘 gradle 이미지 사용
FROM gradle:9.7.1-jdk21-ubi9 AS build
WORKDIR /workspace
COPY build.gradle.kts settings.gradle.kts ./
COPY src src
RUN gradle bootJar --no-daemon

# Stage 2: 레이어 추출 — Spring Boot 공식 문서 패턴(jarmode tools 모드)
# Source: https://docs.spring.io/spring-boot/reference/packaging/container-images/dockerfiles.html
FROM eclipse-temurin:21-jre-jammy AS extract
WORKDIR /builder
COPY --from=build /workspace/build/libs/*.jar application.jar
RUN java -Djarmode=tools -jar application.jar extract --layers --destination extracted

# Stage 3: 런타임 이미지 — 빌드 캐시/Gradle 캐시/원본 소스가 최종 이미지에 남지 않음
FROM eclipse-temurin:21-jre-jammy
RUN useradd --uid 1001 --create-home --shell /usr/sbin/nologin spring
WORKDIR /application
COPY --from=extract /builder/extracted/dependencies/ ./
COPY --from=extract /builder/extracted/spring-boot-loader/ ./
COPY --from=extract /builder/extracted/snapshot-dependencies/ ./
COPY --from=extract /builder/extracted/application/ ./
RUN chown -R spring:spring /application
USER spring
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "application.jar"]
