# JJPlatform — Arquitectura del Sistema

## 1. Visión General

Plataforma SaaS para gestión de centros deportivos, inicialmente enfocada en academias de Jiu-Jitsu.
Cada academia puede gestionar alumnos, pagos, torneos y contenido desde un panel privado.
El sitio público muestra un catálogo de academias con perfiles detallados.

---

## 2. Decisiones Arquitectónicas

### 2.1 Monolito Modular (vs Microservicios)

**Decisión: Monolito Modular**

| Criterio | Monolito Modular | Microservicios |
|---|---|---|
| Complejidad de deploy | Baja (1 artefacto) | Alta (orquestación) |
| Latencia | Sin overhead de red interna | Latencia inter-servicio |
| Costo infra MVP | Bajo (1 servidor) | Alto (múltiples instancias) |
| Velocidad de desarrollo | Alta | Baja (boilerplate x servicio) |
| Escalabilidad futura | Se puede descomponer después | Nativa pero prematura |

**Justificación:** En fase MVP el tráfico será bajo, el equipo pequeño y las funcionalidades están fuertemente acopladas por el dominio (academia → alumnos → pagos). Un monolito modular organizado por paquetes permite migrar a microservicios sin reescritura cuando haya necesidad real. El código se organiza en módulos lógicos (auth, academy, student, payment, tournament, file) dentro de un solo proyecto Spring Boot.

### 2.2 Zustand (vs Redux Toolkit)

**Decisión: Zustand**

- ~1KB, sin boilerplate, API mínima
- No requiere providers ni wrappers
- Perfecto para estado simple: auth token, listados, formularios
- Redux Toolkit es más robusto pero trae complejidad innecesaria para un MVP
- Si el estado crece, se puede migrar a RTK sin cambiar la estructura de componentes

### 2.3 Tailwind CSS (vs Material UI)

**Decisión: Tailwind CSS**

- Diseño 100% customizable (no luce "genérico")
- Bundle más pequeño (purge CSS elimina clases no usadas)
- Mejor para un catálogo visual atractivo donde el branding importa
- Material UI impone un sistema de diseño rígido
- Tailwind + HeadlessUI/Radix cubre componentes interactivos sin sacrificar libertad

---

## 3. Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Java 17+ / Spring Boot 3.x |
| Base de Datos | PostgreSQL 15+ |
| ORM | Spring Data JPA (Hibernate) |
| Auth | JWT (jjwt-api) |
| Email | Spring Mail (SMTP — Brevo en prod) |
| Storage | Sistema de archivos local (migrable a S3) |
| Image validation | ImageIO + magic-byte sniffing |
| Frontend | React 18 + TypeScript |
| Bundler | Vite 5 |
| Estado | Zustand |
| Estilos | Tailwind CSS 3 |
| Routing | React Router 6 |
| HTTP Client | Axios |

---

## 4. Modelo de Base de Datos

```
┌──────────────────────┐   ┌──────────────────┐
│        users         │   │    academies     │
├──────────────────────┤   ├──────────────────┤
│ id (PK)              │1:1│ id (PK)          │
│ email (UNIQUE)       │───│ user_id (FK)     │  (ADMIN only)
│ password (bcrypt)    │   │ name             │
│ role                 │   │ description      │
│ academy_id (FK)      │   │ address          │
│ must_change_password │   │ phone            │
│ created_at           │   │ logo_url         │
│                      │   │ created_at       │
└──────────────────────┘   └───────┬──────────┘
        │  (PROFESOR/ENCARGADO via      │
        │   academy_staff M:N)          │
        │                               │
┌───────▼────────┐                      │
│ academy_staff  │                      │
├────────────────┤                      │
│ academy_id (FK)│                      │
│ user_id (FK)   │                      │
│ active         │                      │
└────────────────┘                      │
                                        │
            ┌──────────────────┼──────────────────┬─────────────────┐
            │                  │                  │                 │
   ┌────────▼───────┐  ┌──────▼────────┐  ┌─────▼──────┐  ┌──────▼──────┐
   │   students     │  │class_schedules│  │ tournaments │  │   photos    │
   ├────────────────┤  ├───────────────┤  ├────────────┤  ├─────────────┤
   │ id (PK)        │  │ id (PK)       │  │ id (PK)    │  │ id (PK)     │
   │ academy_id(FK) │  │ academy_id(FK)│  │ academy_id │  │ academy_id  │
   │ name           │  │ day_of_week   │  │ name       │  │ url         │
   │ age            │  │ start_time    │  │ date       │  │ caption     │
   │ photo_url      │  │ end_time      │  │ max_partic │  │ created_at  │
   │ address        │  │ class_name    │  │ status     │  └─────────────┘
   │ medical_notes  │  └───────────────┘  └─────┬──────┘
   │ active         │                           │
   │ created_at     │                    ┌──────▼──────────────┐
   └───────┬────────┘                    │tournament_participants│
           │                             ├──────────────────────┤
    ┌──────▼──────┐                      │ id (PK)              │
    │  payments   │                      │ tournament_id (FK)   │
    ├─────────────┤                      │ student_id (FK)      │
    │ id (PK)     │                      │ seed                 │
    │ student_id  │                      └──────────┬───────────┘
    │ academy_id  │                                 │
    │ amount      │                      ┌──────────▼──────┐
    │ month       │                      │ bracket_matches  │
    │ year        │                      ├─────────────────┤
    │ paid_at     │                      │ id (PK)         │
    │ notes       │                      │ tournament_id   │
    └─────────────┘                      │ round           │
                                         │ match_number    │
                                         │ participant1_id │
                                         │ participant2_id │
                                         │ winner_id       │
                                         └─────────────────┘
```

### 4.1 Tablas complementarias

```
┌─────────────────┐    ┌─────────────────────────┐    ┌──────────────────────────┐
│   professors    │    │      disciplines        │    │ discipline_age_categories│
├─────────────────┤    ├─────────────────────────┤    ├──────────────────────────┤
│ id (PK)         │    │ id (PK)                 │    │ id (PK)                  │
│ academy_id (FK) │    │ academy_id (FK)         │    │ discipline_id (FK)       │
│ name            │    │ name                    │    │ name                     │
│ email           │    │ active                  │    │ min_age, max_age         │
│ photo_url       │    └─────────────────────────┘    │ display_order            │
│ bio             │                                   └──────────────────────────┘
│ achievements    │    ┌─────────────────────────┐
│ discipline_id   │    │  student_disciplines    │    ┌──────────────────────────┐
│ student_id (FK) │────│ id (PK)                 │    │   belt_promotions        │
│ user_id (FK)    │    │ student_id (FK)         │    ├──────────────────────────┤
│ display_order   │    │ discipline_id (FK)      │    │ id (PK)                  │
│ active          │    │ age_category_id (FK)    │    │ student_discipline_id    │
└────────┬────────┘    │ belt, stripes           │    │ from_belt, to_belt       │
         │             │ join_date, active       │    │ promotion_date           │
         │             └─────────────────────────┘    │ notes, performed_by      │
         │                                            └──────────────────────────┘
         └─── user_id → users (cuenta de login del profesor, opcional)
```

### 4.2 Notas sobre relaciones

- **`users` → `academies`** (1:1): solo para rol `ADMIN`. Cada admin es dueño de exactamente una academia.
- **`users` → `academy_staff` ↔ `academies`** (M:N): para roles `PROFESOR` y `ENCARGADO`. Un staff puede pertenecer a varias academias; `active` controla acceso sin borrar el vínculo.
- **`professors.user_id`**: vincula el perfil público con su cuenta de login. Null si el profesor todavía no tiene acceso al sistema.
- **`professors.student_id`**: opcional. Si el profesor también entrena, se reusa la ficha de alumno (evita duplicar email, datos, etc.).
- **`users.must_change_password`**: true cuando la cuenta fue creada con clave temporal; el frontend fuerza el cambio antes de permitir uso.

---

## 5. Endpoints REST Principales

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login, devuelve JWT + flag `mustChangePassword` |
| POST | `/api/auth/register` | Registro de academia + admin |
| POST | `/api/auth/change-password` | Cambiar contraseña (autenticado). Limpia el flag de cambio obligatorio. |

### Usuarios staff (Privado · ADMIN)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/users` | Listar staff de la academia |
| POST | `/api/users` | Crear ENCARGADO con clave temporal + envío por correo. Los PROFESORES se crean desde la pantalla de Profesores. |
| PUT | `/api/users/{id}/toggle-active` | Activar/desactivar staff |

### Academias (Público)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/public/academies` | Listado de academias |
| GET | `/api/public/academies/{id}` | Perfil de academia con horarios, fotos, torneos |

### Alumnos (Privado)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/students` | Listar alumnos de la academia |
| GET | `/api/students/{id}` | Detalle de alumno |
| POST | `/api/students` | Crear alumno |
| PUT | `/api/students/{id}` | Actualizar alumno |
| DELETE | `/api/students/{id}` | Eliminar alumno |

### Pagos (Privado)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/payments?month=X&year=Y` | Pagos del mes |
| POST | `/api/payments` | Registrar pago |
| GET | `/api/payments/student/{id}` | Historial de pagos de un alumno |

### Torneos (Privado)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/tournaments` | Listar torneos |
| POST | `/api/tournaments` | Crear torneo |
| POST | `/api/tournaments/{id}/participants` | Agregar participante |
| POST | `/api/tournaments/{id}/generate-bracket` | Generar bracket automático |
| PUT | `/api/tournaments/{id}/matches/{matchId}` | Registrar resultado de match |

### Profesores (Privado)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/professors` | Listar profesores con su estado de cuenta (`hasAccount`, `effectiveEmail`) |
| POST | `/api/professors` | Crear profesor (incluye email opcional) |
| PUT | `/api/professors/{id}` | Actualizar profesor |
| DELETE | `/api/professors/{id}` | Desactivar profesor |
| POST | `/api/professors/{id}/grant-access` | **ADMIN only.** Crea cuenta de login con clave temporal y la envía al correo del profesor. |
| POST | `/api/professors/{id}/resend-credentials` | **ADMIN only.** Regenera la clave temporal y la reenvía (la anterior queda inválida). |

### Archivos (Privado)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/files/upload` | Subir imagen genérica o de galería. Param `purpose=gallery\|profile` aplica el perfil correspondiente. |
| POST | `/api/files/logo` | Subir/reemplazar logo de la academia (perfil `LOGO`). |
| GET | `/api/files/{filename}` | Descargar imagen. Devuelve el `Content-Type` real (JPEG/PNG/GIF/WebP) y `Cache-Control` de 30 días. |
| DELETE | `/api/files/photos/{id}` | Eliminar foto de la galería. |

### Horarios (Privado)
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/schedules` | Listar horarios |
| POST | `/api/schedules` | Crear horario |
| PUT | `/api/schedules/{id}` | Actualizar horario |
| DELETE | `/api/schedules/{id}` | Eliminar horario |

---

## 6. Estructura de Carpetas

### Backend
```
backend/
├── pom.xml
└── src/main/
    ├── java/com/jjplatform/api/
    │   ├── JJPlatformApplication.java
    │   ├── config/
    │   │   ├── SecurityConfig.java
    │   │   ├── JwtAuthenticationFilter.java
    │   │   ├── JwtUtil.java
    │   │   └── CorsConfig.java
    │   ├── controller/
    │   │   ├── AuthController.java
    │   │   ├── PublicController.java
    │   │   ├── StudentController.java
    │   │   ├── PaymentController.java
    │   │   ├── TournamentController.java
    │   │   └── FileController.java
    │   ├── dto/
    │   │   ├── LoginRequest.java
    │   │   ├── LoginResponse.java
    │   │   ├── RegisterRequest.java
    │   │   ├── StudentDto.java
    │   │   ├── PaymentDto.java
    │   │   └── TournamentDto.java
    │   ├── exception/
    │   │   ├── ResourceNotFoundException.java
    │   │   └── GlobalExceptionHandler.java
    │   ├── model/
    │   │   ├── User.java
    │   │   ├── Academy.java
    │   │   ├── Student.java
    │   │   ├── ClassSchedule.java
    │   │   ├── Payment.java
    │   │   ├── Tournament.java
    │   │   ├── TournamentParticipant.java
    │   │   ├── BracketMatch.java
    │   │   └── Photo.java
    │   ├── repository/
    │   │   ├── UserRepository.java
    │   │   ├── AcademyRepository.java
    │   │   ├── StudentRepository.java
    │   │   ├── PaymentRepository.java
    │   │   ├── TournamentRepository.java
    │   │   └── ...
    │   └── service/
    │       ├── AuthService.java
    │       ├── StudentService.java
    │       ├── PaymentService.java
    │       ├── TournamentService.java
    │       ├── BracketService.java
    │       └── FileStorageService.java
    └── resources/
        └── application.yml
```

### Frontend
```
frontend/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── api/
    │   ├── client.ts          # Axios instance con interceptor JWT
    │   ├── auth.ts
    │   ├── students.ts
    │   ├── academies.ts
    │   └── tournaments.ts
    ├── stores/
    │   ├── authStore.ts
    │   └── studentStore.ts
    ├── types/
    │   └── index.ts
    ├── components/
    │   ├── Layout.tsx
    │   ├── PrivateRoute.tsx
    │   ├── Navbar.tsx
    │   └── BracketView.tsx
    └── pages/
        ├── public/
        │   ├── Home.tsx
        │   └── AcademyProfile.tsx
        └── admin/
            ├── Login.tsx
            ├── Dashboard.tsx
            ├── Students.tsx
            ├── StudentForm.tsx
            ├── Payments.tsx
            ├── Tournaments.tsx
            └── TournamentDetail.tsx
```

---

## 7. Seguridad

### 7.1 Autenticación y cuentas
- **Passwords:** BCrypt con strength 12.
- **JWT:** Tokens firmados con HMAC-SHA256, expiración 24h.
- **Roles:** `SUPER_ADMIN`, `ADMIN`, `PROFESOR`, `ENCARGADO`.
- **Clave temporal:** Las cuentas creadas por un admin (staff o profesor con acceso) parten con `must_change_password = true` y una clave aleatoria de 12 chars (alfabeto sin caracteres ambiguos como `0/O`, `1/l/I`). El frontend bloquea la app hasta que el usuario cambie la clave.
- **Envío por correo:** Vía SMTP (Brevo gratis hasta 300/día). En dev sin SMTP, la clave temporal se logea por consola.
- **Cambios sensibles** (`grant-access`, `resend-credentials`): protegidos con `@PreAuthorize("hasRole('ADMIN')")`.

### 7.2 General
- **CORS:** Solo orígenes permitidos (frontend URL).
- **Validación:** `@Valid` en todos los DTOs de entrada.
- **Autorización:** Cada endpoint privado verifica que el usuario es dueño de la academia (o staff con acceso).
- **SQL Injection:** Prevenido nativamente por JPA/Hibernate (parámetros preparados).
- **XSS:** React escapa por defecto; Tailwind no genera HTML dinámico.

### 7.3 Upload de imágenes
Validación en dos capas (frontend y backend) usando **perfiles por contexto**:

| Perfil | Uso | Peso máx | Dimensiones |
|---|---|---|---|
| `LOGO` | Logo de academia | 1 MB | 100×100 — 1024×1024 |
| `PROFILE` | Foto de alumno o profesor | 2 MB | 200×200 — 3000×3000 |
| `GALLERY` | Foto de galería pública | 5 MB | 600×400 — 4000×4000 |

Formatos aceptados: JPEG, PNG, GIF, WebP.

- **Magic-byte sniffing** (no se confía en el `Content-Type` del cliente): se leen los primeros 16 bytes y se comparan con la firma binaria de cada formato.
- **Dimension check** vía `ImageIO.read()` (WebP queda exento si el plugin no está cargado).
- **Path traversal**: archivos guardados con UUID + extensión derivada del formato detectado, dentro de `uploadDir` normalizado.
- **Defensa en capas**: el frontend valida antes de subir (UX) pero el backend re-valida siempre.

---

## 8. Flujos de Provisión de Cuentas

### 8.1 Encargado (cuenta administrativa pura)
1. ADMIN → pantalla **Usuarios** → "+ Nuevo usuario" → ingresa email y rol `ENCARGADO`.
2. Backend genera clave temporal, crea `User` + `AcademyStaff`, envía correo de bienvenida.
3. Encargado entra con la clave temporal → frontend redirige a `/admin/change-password`.

### 8.2 Profesor (perfil público + cuenta de acceso opcional)
1. ADMIN → pantalla **Profesores** → "+ Nuevo profesor" → completa datos (incluyendo email opcional).
2. En la tarjeta, botón **"Dar acceso"** (deshabilitado si no hay email propio ni del alumno vinculado).
3. Confirma → backend valida email único → crea `User` con rol `PROFESOR`, lo enlaza vía `professors.user_id`, manda correo.
4. Si el profesor pierde la clave, ADMIN usa **"Reenviar clave"** → genera una nueva (invalida la anterior).

### 8.3 Variables de entorno relevantes
| Variable | Default | Uso |
|---|---|---|
| `SMTP_HOST` | `smtp-relay.brevo.com` | Servidor SMTP |
| `SMTP_PORT` | `587` | Puerto SMTP (STARTTLS) |
| `SMTP_USER` | _(vacío)_ | Si vacío → envío deshabilitado, clave se logea en consola |
| `SMTP_PASSWORD` | _(vacío)_ | SMTP key de Brevo |
| `MAIL_FROM` | `no-reply@jjplatform.app` | Remitente verificado en Brevo |
| `MAIL_FROM_NAME` | `JJPlatform` | Display name del remitente |
| `MAIL_LOGIN_URL` | URL del frontend | URL embebida en el correo de bienvenida |

---

## 9. Recomendaciones para Escalar

1. **Storage:** Migrar archivos de filesystem local a AWS S3/MinIO
2. **Cache:** Agregar Redis para sesiones y listados públicos frecuentes
3. **Search:** Elasticsearch para búsqueda de academias por ubicación
4. **CDN:** CloudFront o similar para imágenes estáticas
5. **CI/CD:** GitHub Actions → Docker → AWS ECS o similar
6. **Multi-tenancy:** Ya diseñado con `academy_id` en todas las tablas
7. **Microservicios:** Si el módulo de torneos crece mucho, extraerlo primero
8. **Rate Limiting:** Agregar throttling en endpoints públicos
9. **Monitoring:** Spring Actuator + Prometheus + Grafana
10. **Internacionalización:** i18n en frontend desde el inicio si se planea expansión
