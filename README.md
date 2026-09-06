# SocietyOne — Residential Community & Visitor Management Platform

[![Java](https://img.shields.io/badge/Java-21%2B-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4%2B-6DB33F?logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2B-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

SocietyOne is a modern, full-stack residential security and visitor operating system. It synchronizes visitors, apartment residents, and gate security desks into a unified digital workflow—eliminating manual paper logbooks, long gate queues, and unauthorized entries.

---

## Key System Workflows

### 1. Zero-Barrier Guest & Instant Visitor Requests
- **No Signup Required**: Visitors do not create accounts or download apps.
- **Direct Web Access**: Visitors open the public portal (`/invite`), select their host (Society → Building → Floor → Flat → Resident), and submit entry requests with zero login friction.
- **Live Tracking**: Issues a unique request token (`#REQ-...`) with real-time status updates from submission to gate clearance.

### 2. Resident Experience
- **Real-Time Notifications**: Instant mobile and portal alerts for visitor arrivals.
- **One-Tap Approvals**: Approve or deny entry in seconds with optional instructions.
- **Delivery Pre-Authorizations**: Pre-approve delivery drivers (Swiggy, Zomato, Amazon, courier) directly to gate security.
- **Regular Visitor Management**: Manage domestic staff, drivers, and contractors across single or multi-flat assignments with permanent or custom validities.

### 3. Gate Security Operations
- **Live Arrival Queue**: Real-time synchronization of resident-approved entries.
- **Walk-In & Delivery Verification**: Fast identity verification, phone lookup, and digital gate pass generation.
- **Recurring Pass Validation**: Instant check-in for registered domestic workers and contractors.
- **Departure Check-Out**: Timestamped exits with automatic duration calculation.

### 4. Administrative Control & Compliance
- **Hierarchical Society Structure**: Manage Societies, Buildings/Towers, Floors, and Flats.
- **Staff Provisioning**: Provision and audit security officer credentials.
- **Immutable Audit Trail**: SHA-validated, timestamped audit records for every request, approval, gate admission, and checkout.

---

## Architecture & Tech Stack

```
Appartmentproject/
├── societyone-backend/       # Spring Boot 3.4+ (Java 21) REST API
│   ├── src/main/java/        # Clean MVC Architecture (Auth, Society, Visitor, Security, Audit, Common)
│   ├── src/main/resources/   # Flyway SQL migrations (V1 - V11) & application.yaml
│   ├── pom.xml               # Maven configuration
│   └── .env.example          # Backend environment variable template
├── societyone-frontend/      # React 19 + TypeScript + Vite SPA
│   ├── src/routes/           # TanStack Router file-based routing
│   ├── src/components/       # UI components & Design System
│   ├── src/services/         # Strongly-typed HTTP API clients
│   ├── package.json          # Frontend npm dependencies
│   └── .env.example          # Frontend environment variable template
├── .env.example              # Root environment variable documentation
└── README.md                 # System documentation
```

### Backend Technologies
- **Framework**: Spring Boot 3.4+ / Java 21
- **Database**: PostgreSQL with Hibernate / JPA & Flyway Migrations
- **Security**: Spring Security with stateless JWT (JSON Web Tokens)
- **Email Service**: Spring Mail with SMTP (Google App Password support)
- **Validation**: Jakarta Bean Validation (`@Valid`)

### Frontend Technologies
- **Framework**: React 19 + Vite 6
- **Language**: TypeScript 5.7
- **Routing**: TanStack Router (file-based routing with type-safe route guards)
- **Styling**: Tailwind CSS v4 + Radix UI primitives + Lucide Icons
- **HTTP Client**: Native `fetch` with reverse proxy support and structured error mapping

---

## Local Development Setup

### Prerequisites
- **Java JDK 21+**: Verify with `java -version`
- **Node.js 20+ & npm**: Verify with `node -v`
- **PostgreSQL 16+**: Running locally on port `5432`

---

### Step 1: Database Setup
1. Create a PostgreSQL database named `societyone`:
   ```sql
   CREATE DATABASE societyone;
   ```
2. Migrations are executed automatically by Flyway upon backend startup (`V1` through `V11`).

---

### Step 2: Backend Configuration & Startup
1. Navigate to the backend directory:
   ```bash
   cd societyone-backend
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. Configure your local `.env` file (or set system environment variables):
   ```properties
   SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/societyone
   SPRING_DATASOURCE_USERNAME=postgres
   SPRING_DATASOURCE_PASSWORD=your_postgres_password

   # Optional: Real SMTP email delivery for OTPs
   SPRING_MAIL_HOST=smtp.gmail.com
   SPRING_MAIL_PORT=587
   SPRING_MAIL_USERNAME=your_gmail@gmail.com
   SPRING_MAIL_PASSWORD=your_16_char_app_password
   MAIL_FROM=your_gmail@gmail.com
   MAIL_ENABLED=true
   ```
4. Build and run the Spring Boot application:
   ```bash
   mvn clean compile
   mvn spring-boot:run
   ```
   The backend will start at `http://localhost:8081`.

---

### Step 3: Frontend Configuration & Startup
1. In a new terminal, navigate to the frontend directory:
   ```bash
   cd societyone-frontend
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
3. In local development, the frontend routes `/api` through Vite's built-in reverse proxy to `http://localhost:8081`:
   ```properties
   VITE_API_BASE_URL=/api
   ```
4. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev
   ```
   The application will be accessible at `http://localhost:5173`.

---

## Production Deployment Guide

### Frontend Deployment (Vercel, Netlify, Cloudflare Pages, or Nginx)
1. Build the production bundle:
   ```bash
   cd societyone-frontend
   npm run build
   ```
2. The optimized static bundle is output to `societyone-frontend/dist/`.
3. Set the production environment variable:
   ```properties
   VITE_API_BASE_URL=https://api.yourdomain.com/api
   ```
4. Configure SPA fallback: Ensure your web server rewrites all incoming routes to `index.html`.

### Backend Deployment (Linux / VPS / Cloud Server)
1. Package the executable standalone JAR:
   ```bash
   cd societyone-backend
   mvn clean package -DskipTests
   ```
2. The executable JAR is located at `target/societyone-backend-0.0.1-SNAPSHOT.jar`.
3. Run as a systemd service or background process:
   ```bash
   java -jar target/societyone-backend-0.0.1-SNAPSHOT.jar \
     --spring.datasource.url=jdbc:postgresql://your-db-host:5432/societyone \
     --spring.datasource.username=your_db_user \
     --spring.datasource.password=your_db_password
   ```
4. Configure CORS in `SecurityConfig.java` to whitelist your production frontend domain (`https://app.yourdomain.com`).

---

## Security & Privacy Policy

- **No Secrets in Source Control**: `.env` files, passwords, app secrets, and tokens are strictly excluded via `.gitignore`.
- **Stateless Authentication**: Secure JWT tokens stored on the client; invalid credentials rejected with standard HTTP 401.
- **Immutable Audit Logging**: Actions taken by residents, security personnel, and administrators are immutably recorded in `audit_logs`.

---

## Author & Maintainer

**satyssundar** — [GitHub Profile](https://github.com/satyaumi)
