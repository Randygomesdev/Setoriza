# ─── Stage 1: Build ─────────────────────────────────────────────────────────
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# cache de dependências separado do código-fonte
COPY pom.xml .
RUN mvn dependency:go-offline -B

COPY src ./src
RUN mvn clean package -DskipTests -q

# ─── Stage 2: Runtime (JRE slim) ────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Instalar ffmpeg para conversão de áudio
RUN apk add --no-cache ffmpeg

# usuário não-root para segurança
RUN addgroup -S setoriza && adduser -S setoriza -G setoriza
USER setoriza

COPY --from=build /app/target/*.jar app.jar
EXPOSE 8082
ENTRYPOINT ["java", "-jar", "app.jar"]
