# SocietyOne — Production Deployment Guide

This guide details the deployment architecture, prerequisites, configuration, and step-by-step procedures for running SocietyOne in a production environment.

---

## 1. System Architecture Overview

```
                          Internet / Clients
                                  │
                                  ▼
                   ┌──────────────────────────────┐
                   │  Reverse Proxy / Nginx / CDN │
                   │  SSL Termination (HTTPS)    │
                   └──────────────┬───────────────┘
                                  │
                  ┌───────────────┴───────────────┐
                  ▼                               ▼
       ┌─────────────────────┐         ┌─────────────────────┐
       │  Frontend Static    │         │  Backend REST API   │
       │  (Vite / React SPA) │         │  (Spring Boot / Java)│
       │  Port: 80 / 443     │         │  Port: 8081 / App   │
       └─────────────────────┘         └──────────┬──────────┘
                                                  │
                                       ┌──────────┴──────────┐
                                       ▼                     ▼
                            ┌───────────────────┐ ┌───────────────────┐
                            │ PostgreSQL 16+    │ │ SMTP Mail Server  │
                            │ Database (5432)   │ │ (TLS / Port 587)  │
                            └───────────────────┘ └───────────────────┘
```

---

## 2. Production Prerequisites

| Component | Minimum Requirement | Recommended Production |
|---|---|---|
| **Operating System** | Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9) | Ubuntu 22.04 LTS |
| **Java Runtime** | OpenJDK 21 (Headless) | Eclipse Temurin 21 LTS |
| **Node.js** | Node.js 20.x LTS + npm | Node.js 22.x LTS (Build stage only) |
| **Database** | PostgreSQL 16+ | Managed PostgreSQL (AWS RDS / Supabase / DigitalOcean) |
| **Memory / CPU** | 2 GB RAM / 1 vCPU | 4 GB RAM / 2 vCPU |
| **Storage** | 20 GB SSD | 50 GB NVMe SSD |

---

## 3. Environment Variables Reference

Create a secure `.env` file or supply environment variables directly via your service manager / container environment.

### Backend (`societyone-backend`)
```properties
# Database Connectivity
SPRING_DATASOURCE_URL=jdbc:postgresql://<DB_HOST>:5432/societyone
SPRING_DATASOURCE_USERNAME=<DB_USER>
SPRING_DATASOURCE_PASSWORD=<SECURE_DB_PASSWORD>

# Connection Pool (HikariCP)
HIKARI_MAX_POOL_SIZE=25
HIKARI_MIN_IDLE=5
HIKARI_CONNECTION_TIMEOUT=30000

# Security & JWT Token Signing
# Generate a cryptographically secure 256-bit+ secret (e.g. openssl rand -base64 32)
JWT_SECRET=<BASE64_ENCODED_256_BIT_SECRET>
JWT_EXPIRATION_MS=86400000

# Server & Network Configuration
SERVER_PORT=8081
CORS_ALLOWED_ORIGINS=https://app.yourdomain.com,https://admin.yourdomain.com

# Email / SMTP Delivery
SPRING_MAIL_HOST=smtp.gmail.com
SPRING_MAIL_PORT=587
SPRING_MAIL_USERNAME=<SMTP_USERNAME_OR_EMAIL>
SPRING_MAIL_PASSWORD=<SMTP_APP_PASSWORD>
SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true
SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true
MAIL_FROM=<SMTP_FROM_EMAIL>
MAIL_FROM_NAME=SocietyOne
MAIL_ENABLED=true
MAIL_DEV_FALLBACK_ENABLED=false
```

### Frontend (`societyone-frontend`)
```properties
# API Gateway / Backend Base Endpoint
VITE_API_BASE_URL=https://api.yourdomain.com/api
```

---

## 4. Database Setup & Migrations

1. Ensure the PostgreSQL database exists with UTF-8 encoding:
   ```sql
   CREATE DATABASE societyone WITH ENCODING 'UTF8';
   ```
2. Flyway migrations (`V1` through `V15`) will execute automatically on application startup.
3. Verify migrations:
   ```sql
   SELECT version, description, installed_on, success FROM flyway_schema_history ORDER BY installed_rank;
   ```

---

## 5. Backend Build & Service Setup

### 5.1 Build the Standalone Production JAR
```bash
cd societyone-backend
mvn clean package -DskipTests
```
The output JAR is generated at `target/societyone-backend-0.0.1-SNAPSHOT.jar`.

### 5.2 Systemd Service Configuration (`/etc/systemd/system/societyone.service`)
```ini
[Unit]
Description=SocietyOne Backend API Service
After=network.target postgresql.service

[Service]
Type=simple
User=societyone
WorkingDirectory=/opt/societyone/backend
EnvironmentFile=/opt/societyone/backend/.env
ExecStart=/usr/bin/java -Xms512m -Xmx1536m -jar societyone-backend-0.0.1-SNAPSHOT.jar
SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable societyone
sudo systemctl start societyone
```

---

## 6. Frontend Build & Static Serving

### 6.1 Build Frontend Bundle
```bash
cd societyone-frontend
npm ci
npm run build
```
Optimized assets are written to `societyone-frontend/dist/`.

### 6.2 Nginx Configuration (`/etc/nginx/sites-available/societyone`)
```nginx
server {
    listen 80;
    server_name app.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/app.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.yourdomain.com/privkey.pem;

    root /var/www/societyone/dist;
    index index.html;

    # Static assets caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Uploaded media assets proxy
    location /uploads/ {
        proxy_pass http://127.0.0.1:8081/uploads/;
        proxy_set_header Host $host;
    }

    # API Proxy to Spring Boot
    location /api/ {
        proxy_pass http://127.0.0.1:8081/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA Client Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 7. Security Hardening Checklist

- [ ] All `.env` files and credentials are removed from Git tracking and protected with restrictive file permissions (`chmod 600 .env`).
- [ ] Database is accessible only via localhost or private VPC subnet.
- [ ] Production JWT secret is at least 256 bits and unique to the environment.
- [ ] HTTPS (TLS 1.3) is enforced on all endpoints.
- [ ] Rate limiting filter is active on sensitive authentication routes (`/api/auth/otp/**`, `/api/auth/login`).
- [ ] `MAIL_DEV_FALLBACK_ENABLED` is set to `false` in production.
