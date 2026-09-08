# ==============================================================================
# Build Stage 1: Frontend Build (Node.js + Vite)
# ==============================================================================
FROM node:22-alpine AS frontend-builder

WORKDIR /app

COPY societyone-frontend/package*.json ./
RUN npm install

COPY societyone-frontend/ ./
RUN npm run build

# ==============================================================================
# Build Stage 2: Backend Build (Maven + Spring Boot Full-Stack Single App)
# ==============================================================================
FROM maven:3.9.9-eclipse-temurin-21 AS backend-builder

WORKDIR /workspace

ENV MAVEN_OPTS="-Xmx768m -XX:+TieredCompilation -XX:TieredStopAtLevel=1"

COPY societyone-backend/pom.xml ./
COPY societyone-backend/src ./src

# Copy freshly compiled frontend bundle into Spring Boot's static resources
COPY --from=frontend-builder /app/dist/ ./src/main/resources/static/

RUN mvn clean package -DskipTests -B

# ==============================================================================
# Production Runtime Stage
# ==============================================================================
FROM eclipse-temurin:21-jre

LABEL maintainer="SocietyOne Engineering <supportsocietyone@gmail.com>"
LABEL service="societyone-fullstack"

WORKDIR /app

RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -m appuser && \
    mkdir -p /app/uploads && \
    chown -R appuser:appgroup /app

COPY --from=backend-builder --chown=appuser:appgroup /workspace/target/societyone-backend-*.jar /app/app.jar

USER appuser

ENV PORT=8081
EXPOSE 8081

ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-XX:+UseContainerSupport", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
