# ==============================================================================
# Build Stage
# ==============================================================================
FROM maven:3.9.9-eclipse-temurin-21-alpine AS builder

WORKDIR /workspace

# Cache dependencies first
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .
RUN mvn dependency:go-offline -B

# Build application
COPY src src
RUN mvn clean package -DskipTests -B

# ==============================================================================
# Production Runtime Stage
# ==============================================================================
FROM eclipse-temurin:21-jre-alpine

LABEL maintainer="SocietyOne Engineering <supportsocietyone@gmail.com>"
LABEL service="societyone-backend"

WORKDIR /app

# Create non-root system user and secure uploads directory
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app

# Copy compiled jar from build stage
COPY --from=builder --chown=appuser:appgroup /workspace/target/societyone-backend-*.jar /app/app.jar

USER appuser:appgroup

# Render dynamic PORT fallback to 8081
ENV PORT=8081
EXPOSE 8081

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
