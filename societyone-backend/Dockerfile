# ==============================================================================
# Build Stage
# ==============================================================================
FROM maven:3.9.9-eclipse-temurin-21 AS builder

WORKDIR /workspace

ENV MAVEN_OPTS="-Xmx768m -XX:+TieredCompilation -XX:TieredStopAtLevel=1"

COPY pom.xml ./
COPY src ./src

RUN mvn clean package -DskipTests -B

# ==============================================================================
# Production Runtime Stage
# ==============================================================================
FROM eclipse-temurin:21-jre

LABEL maintainer="SocietyOne Engineering <supportsocietyone@gmail.com>"
LABEL service="societyone-backend"

WORKDIR /app

RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -m appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app

COPY --from=builder --chown=appuser:appgroup /workspace/target/societyone-backend-*.jar /app/app.jar

USER appuser

ENV PORT=8081
EXPOSE 8081

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
