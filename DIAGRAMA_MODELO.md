# Cómo funciona JJPlatform — Guía para el cliente

---

## El flujo de configuración de tu academia

El sistema está diseñado para que configures tu academia de forma ordenada, siguiendo estos pasos:

---

## Paso 1 — Crear Disciplinas

Una **Disciplina** es el arte marcial o deporte que enseñas.

```
Ejemplos:
  🥋 Jiu-Jitsu Brasileño
  🤼 Grappling
  👊 Kickboxing
  🥊 Boxeo
```

Las disciplinas son la base de todo. Desde ellas se organizan los planes y los profesores.

---

## Paso 2 — Registrar Profesores

Un **Profesor** es quien imparte las clases. Puedes registrar:

- Nombre y foto
- Cinturón / grado
- Biografía y trayectoria
- Logros y títulos (uno por línea)

---

## Paso 3 — Crear Planes

Un **Plan** es la tarifa mensual que pagan los alumnos. Cada plan se vincula a:

- Una **Disciplina** (¿de qué deporte es este plan?)
- Un **Profesor** (¿quién dicta este plan?)
- Un precio mensual
- Características o beneficios incluidos

```
Ejemplo:
  Plan: "Jiu-Jitsu Adultos — 3 veces/semana"
  Disciplina: Jiu-Jitsu
  Profesor: Juan González
  Precio: $45.000/mes
```

---

## Paso 4 — Inscribir Alumnos en Planes

Al crear o editar un **Alumno**, puedes seleccionar en qué planes está inscrito.

Un alumno puede estar en **más de un plan** (por ejemplo: Jiu-Jitsu + Grappling).

El sistema suma automáticamente el total mensual del alumno según sus planes activos.

---

## Paso 5 — Registrar Pagos

Al registrar el pago mensual de un alumno:

1. El sistema detecta sus planes y calcula el **total esperado** automáticamente
2. Puedes aplicar un **descuento** en pesos o porcentaje
3. Puedes registrar el **pago completo** o un **abono parcial**
4. Queda registrado el monto pendiente si es un abono

---

## Diagrama general del modelo

```
┌─────────────────────────────────────────────────────────────────┐
│                        TU ACADEMIA                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
          ┌───────────┴───────────┐
          │                       │
    ┌─────▼──────┐         ┌──────▼──────┐
    │ DISCIPLINA │         │  PROFESOR   │
    │            │         │             │
    │ Jiu-Jitsu  │         │ Juan García │
    │ Grappling  │         │ María López │
    │ Kickboxing │         │             │
    └─────┬──────┘         └──────┬──────┘
          │                       │
          └──────────┬────────────┘
                     │
               ┌─────▼──────┐
               │    PLAN    │
               │            │
               │ Define:    │
               │ - Disciplina│
               │ - Profesor │
               │ - Precio   │
               │ - Beneficios│
               └─────┬──────┘
                     │
               ┌─────▼──────┐
               │   ALUMNO   │
               │            │
               │ Inscrito   │
               │ en 1 o más │
               │ planes     │
               └─────┬──────┘
                     │
               ┌─────▼──────┐
               │    PAGO    │
               │            │
               │ Mensual    │
               │ Auto-calc  │
               │ Descuentos │
               │ Abonos     │
               └────────────┘
```

---

## ¿Qué ve el público en tu perfil?

El perfil público de tu academia muestra automáticamente:

| Sección | Qué muestra |
|---|---|
| **Profesores** | Foto grande, cinturón, bio, logros — con filtro por disciplina |
| **Horarios** | Clases organizadas por día con el profesor asignado |
| **Planes** | Tarifas agrupadas por disciplina, con botón de consulta WhatsApp |
| **Galería** | Fotos de la academia (separadas de las fotos de perfil) |
| **Torneos** | Torneos activos y pasados |
| **Graduaciones** | Últimas promociones de cinturón |

---

## Orden recomendado al configurar una nueva academia

```
1. Crear Disciplinas
       ↓
2. Registrar Profesores  
       ↓
3. Crear Planes (vinculando disciplina + profesor)
       ↓
4. Cargar Alumnos (asignando sus planes)
       ↓
5. Registrar Pagos mensuales
```

---

*JJPlatform · Sistema de gestión para academias de artes marciales*
*https://jjplatform.vercel.app*
