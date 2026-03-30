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
| Storage | Sistema de archivos local (migrable a S3) |
| Frontend | React 18 + TypeScript |
| Bundler | Vite 5 |
| Estado | Zustand |
| Estilos | Tailwind CSS 3 |
| Routing | React Router 6 |
| HTTP Client | Axios |

---

## 4. Modelo de Base de Datos

```
┌──────────────┐       ┌──────────────────┐
│    users     │       │    academies     │
├──────────────┤       ├──────────────────┤
│ id (PK)      │──1:1──│ id (PK)          │
│ email        │       │ user_id (FK)     │
│ password     │       │ name             │
│ role         │       │ description      │
│ created_at   │       │ address          │
│              │       │ phone            │
│              │       │ logo_url         │
│              │       │ created_at       │
└──────────────┘       └───────┬──────────┘
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

---

## 5. Endpoints REST Principales

### Auth
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Login, devuelve JWT |
| POST | `/api/auth/register` | Registro de academia + admin |

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

### Archivos (Privado)
| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/files/upload` | Subir imagen |
| GET | `/api/files/{filename}` | Descargar imagen |

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

- **Passwords:** BCrypt con strength 12
- **JWT:** Tokens firmados con HMAC-SHA256, expiración 24h
- **CORS:** Solo orígenes permitidos (frontend URL)
- **Validación:** `@Valid` en todos los DTOs de entrada
- **Autorización:** Cada endpoint privado verifica que el usuario es dueño de la academia
- **File Upload:** Validación de tipo MIME, tamaño máximo 5MB, nombres sanitizados
- **SQL Injection:** Prevenido nativamente por JPA/Hibernate (parámetros preparados)
- **XSS:** React escapa por defecto; Tailwind no genera HTML dinámico

---

## 8. Recomendaciones para Escalar

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
