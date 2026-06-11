# 🛠️ Tecnologías y Dependencias — JJPlatform

Documentación del stack tecnológico completo del proyecto: plataforma de gestión de academias
de artes marciales con panel administrativo web, portal del alumno y app móvil nativa.

> Las versiones reflejan los manifiestos del repo ([frontend/package.json](frontend/package.json)
> y [backend/pom.xml](backend/pom.xml)). El prefijo `^` indica "esa versión o superior compatible".

---

## 🏗️ Arquitectura general

| Capa | Tecnología | Hosting |
|---|---|---|
| Frontend web (admin + portal alumno) | React 18 + TypeScript + Vite | Vercel |
| App móvil del alumno (Android/iOS) | Capacitor 8 (envuelve el mismo frontend) | — (build local) |
| Backend API REST | Spring Boot 3.2.5 (Java 17) | Railway (Docker) |
| Base de datos | PostgreSQL 18 | Railway |
| Archivos subidos (fotos, etc.) | Volumen persistente `/uploads` | Railway |
| Email transaccional | Brevo (SMTP + API HTTP) | — |

---

## ⚛️ Frontend (`frontend/`)

### Núcleo

| Dependencia | Versión | Uso |
|---|---|---|
| `react` / `react-dom` | ^18.3.1 | Librería UI |
| `react-router-dom` | ^6.23.1 | Enrutamiento SPA (admin, portal, login) |
| `typescript` | ^5.4.5 | Tipado estático |
| `vite` | ^5.3.1 | Dev server y bundler de producción |
| `zustand` | ^4.5.2 | Estado global ligero (sesión, stores) |
| `axios` | ^1.7.2 | Cliente HTTP hacia la API |

### UI y experiencia

| Dependencia | Versión | Uso |
|---|---|---|
| `tailwindcss` | ^3.4.4 | Estilos utility-first (+ `postcss`, `autoprefixer`) |
| `swiper` | ^12.1.3 | Carruseles (portadas, galerías) |
| `yet-another-react-lightbox` | ^3.30.1 | Visor de fotos a pantalla completa |
| `driver.js` | ^1.4.0 | Tours guiados de onboarding |

### Reportes y utilidades

| Dependencia | Versión | Uso |
|---|---|---|
| `jspdf` + `jspdf-autotable` | ^4.2.1 / ^5.0.7 | Exportación de reportes a PDF |
| `xlsx` | ^0.18.5 | Exportación a Excel |
| `qrcode` (+ `@types/qrcode`) | ^1.5.4 | Generación de códigos QR |
| `bcryptjs` | ^3.0.3 | Hashing de contraseñas en utilidades |

### App móvil — Capacitor 8

El portal del alumno se empaqueta como app nativa (appId `com.jjplatform.app`).
Plataformas `android/` e `ios/` generadas dentro de `frontend/`. Helpers nativos en
[frontend/src/native/](frontend/src/native/).

| Plugin | Versión | Uso |
|---|---|---|
| `@capacitor/core` + `@capacitor/cli` | ^8.4.0 | Runtime y tooling |
| `@capacitor/android` / `@capacitor/ios` | ^8.4.0 | Plataformas nativas |
| `@capacitor/local-notifications` | ^8.2.0 | Recordatorios de racha y rescate (escalera de 3 días) |
| `@capacitor/push-notifications` | ^8.1.1 | Scaffolding de push (pendiente de backend) |
| `@capacitor/haptics` | ^8.0.2 | Vibración táctil (celebraciones, acciones) |
| `@capacitor/preferences` | ^8.0.1 | Almacenamiento seguro del token de sesión |
| `@capacitor/splash-screen` | ^8.0.1 | Pantalla de arranque |
| `@capacitor/app` | ^8.1.0 | Ciclo de vida y botón atrás de Android |

> ⚠️ Capacitor 8 requiere **Java 21** para compilar la app Android (Android Studio lo trae embebido).

### Tooling de desarrollo

| Dependencia | Versión | Uso |
|---|---|---|
| `eslint` + `@typescript-eslint/*` | ^8.57 / ^7.13 | Linting |
| `eslint-plugin-react-hooks` / `react-refresh` | ^4.6.2 / ^0.4.7 | Reglas de hooks y HMR |
| `@vitejs/plugin-react` | ^4.3.1 | Integración React en Vite |

---

## ☕ Backend (`backend/`)

**Java 17 · Spring Boot 3.2.5 · Maven (wrapper incluido `mvnw.cmd`)**

### Starters de Spring Boot

| Dependencia | Uso |
|---|---|
| `spring-boot-starter-web` | API REST (controladores `/api/**`) |
| `spring-boot-starter-data-jpa` | Persistencia con Hibernate (esquema auto: `ddl-auto: update`) |
| `spring-boot-starter-security` | Autenticación/autorización por roles (SUPER_ADMIN, ADMIN, PROFESSOR, STUDENT) |
| `spring-boot-starter-validation` | Validación de DTOs |
| `spring-boot-starter-mail` | Correos por SMTP (invitaciones de staff) |

### Otras dependencias

| Dependencia | Versión | Uso |
|---|---|---|
| `org.postgresql:postgresql` | (gestionada por Boot) | Driver de PostgreSQL |
| `io.jsonwebtoken:jjwt-*` (api/impl/jackson) | 0.12.5 | Tokens JWT (expiración 24 h) |
| `org.projectlombok:lombok` | (gestionada) | Reducción de boilerplate (`@Data`, `@RequiredArgsConstructor`…) |
| `me.paulschwarz:spring-dotenv` | 4.0.0 | Variables desde `.env` en desarrollo |
| `spring-boot-starter-test` + `spring-security-test` | (test) | Pruebas |
| `com.h2database:h2` | (test) | Base de datos en memoria para tests |

### Integraciones externas (vía HTTP, sin SDK)

| Servicio | Uso | Configuración |
|---|---|---|
| **Anthropic Claude / Gemini / Groq** | Chat asistente de la academia (`AcademyChatService`) | `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` |
| **Brevo** | Email transaccional por API HTTPS (Railway bloquea puertos SMTP) | `BREVO_API_KEY`, `MAIL_FROM` |

---

## 🚀 Infraestructura y despliegue

| Pieza | Tecnología | Notas |
|---|---|---|
| Frontend | **Vercel** | https://jjplatform.vercel.app — `VITE_API_BASE_URL` apunta a Railway |
| Backend | **Railway** (Dockerfile) | Imagen `eclipse-temurin:17-jre` (glibc, **no** Alpine) |
| Base de datos | **PostgreSQL 18** en Railway | Misma región que el backend (EU West) — obligatorio |
| Archivos | Volumen Railway en `/uploads` | El volumen fija la región del servicio |
| Dev local | `docker-compose.yml` | PostgreSQL local |
| CI / repo | GitHub (`.github/`) | Deploy automático al hacer push |

Variables de entorno documentadas en [SECRETS_AND_VARS.md](SECRETS_AND_VARS.md);
guía de deploy en [STEP_BY_STEP.md](STEP_BY_STEP.md) y [QUICK_DEPLOY.md](QUICK_DEPLOY.md).

---

## 💻 Herramientas requeridas para desarrollar

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js + npm | 18+ (en uso: 24) | Frontend y tooling de Capacitor |
| JDK | 17 (Temurin) | Compilar/correr el backend |
| Android Studio | última | Compilar y probar la app Android (incluye SDK, emulador y JDK 21) |
| Docker | opcional | PostgreSQL local vía `docker-compose` |

### Comandos rápidos

```powershell
# Frontend web
cd frontend; npm run dev          # desarrollo
cd frontend; npm run build        # producción (tsc + vite)

# App móvil
cd frontend; npm run build; npx cap sync android; npx cap open android

# Backend
cd backend; .\mvnw.cmd spring-boot:run
cd backend; .\mvnw.cmd -DskipTests compile
```
