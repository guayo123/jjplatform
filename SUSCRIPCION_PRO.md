# Suscripción "Progreso Pro" — JJPlatform

Tier premium **para el alumno** (B2C). El gancho es **más visibilidad de su propio entrenamiento**:
el plan gratis ya muestra harto, pero centrado en el **mes actual** y rangos cortos; Pro abre la lectura
**larga, histórica y comparativa**.

> Estado: **v1 implementado** (analítica + gating + activación manual por admin). Cobro online (Google
> Play Billing) es una fase posterior — ver "Cómo se activa / paga".

---

## Qué incluye Pro (funciones exclusivas)

Todo vive en la pestaña **"Pro ⭐"** dentro de *Entreno* en el portal del alumno.

### 1. Tú vs tu academia
Cómo se compara el alumno con el resto de su academia (es el único bloque que necesita datos del
servidor y está protegido server-side):
- **Entrenos esta semana** vs el **promedio** de la academia.
- **Tu racha** (días seguidos) vs el promedio.
- **Tu puesto** (#N de M) por entrenos de la semana.
- **Percentil** — "estás sobre el X% de tus compañeros".

### 2. Tu volumen (últimos 12 meses)
Gráfico de barras con la **cantidad de entrenos por mes del último año** (cuenta BJJ + Kickboxing +
acondicionamiento). Responde "¿estoy entrenando más o menos con el tiempo?", que el plan gratis (6-10
semanas) no alcanza a mostrar.

### 3. Tus sumisiones (histórico)
Evolución de cada sumisión en **todo el historial**, no solo el mes:
- Top sumisiones por **logradas**.
- **% de efectividad** por sumisión (logradas / (logradas + recibidas)).
- Totales: logradas vs recibidas (lectura ataque/defensa de largo plazo).

### 4. Insights IA ✨ (análisis con inteligencia artificial)
La IA (Claude) **lee los datos reales de entrenamiento del alumno** y devuelve un análisis personalizado en
3 párrafos: **lo que está haciendo bien**, su **punto débil/riesgo**, y **2-3 acciones concretas** para las
próximas semanas (qué drillear). Usa sus números: tendencia de entrenos (30d vs previos), Gi/No-Gi, racha,
puesto vs academia, y sus sumisiones logradas/recibidas con efectividad.
- **On-demand con caché diaria:** el alumno toca "Generar análisis con IA" y el resultado queda guardado;
  **se regenera como máximo 1 vez al día** por alumno (la IA no se vuelve a llamar si ya hay uno de hoy),
  así el costo está acotado.
- Reusa la integración de IA existente (la misma de la asistente de WhatsApp): Claude Haiku con caché de
  prompt y *fallback* a Groq/Gemini si Claude no está disponible.

---

## Gratis vs Pro

| Tema | Gratis | Pro |
|---|---|---|
| Insights narrativos | Solo **mes actual** | — |
| Gráficos de asistencia/horas | 6–10 semanas | **Historial / 12 meses** |
| Sumisión estrella | "del mes" | **Evolución y efectividad histórica** |
| Comparativa con la academia | ❌ | ✅ **percentil, puesto, vs promedio** |
| Análisis con IA de tu progreso | ❌ | ✅ **Insights IA (1 al día)** |
| Racha, leaderboard, logros, peso, PRs | ✅ | ✅ |

> El resto de la app (registrar entrenos/duelos, racha, leaderboard, pagos, etc.) **sigue siendo gratis**.
> Pro solo agrega la capa de **analítica de progreso**.

---

## Cómo se activa / paga

### Hoy (v1 — activación manual)
No hay cobro dentro de la app todavía. El **admin** activa el Pro a un alumno:
- Admin → ficha del alumno → tarjeta **"Progreso Pro ⭐"** → botones **+1 / +3 / +12 meses** o **Quitar**.
- El alumno paga **por fuera** (transferencia/efectivo) y se le otorga manualmente.
- Un alumno **sin Pro** ve un **paywall** (vista difuminada + "Hazte Pro → habla con tu academia").

### Fase 2 (cobro automático)
- **En la app (Play Store): Google Play Billing** — política de Google obliga a cobrar contenido digital
  por su facturación; el alumno paga con la cuenta de su Play Store y Google retiene ~15%.
- **En el portal web:** puede cobrarse con pasarela propia (Khipu/Mercado Pago), no está sujeto a Play Billing.
- En ambos casos, el pago confirmado reusa la misma lógica de "extender `premiumUntil` por N meses" que ya
  usa la activación manual.

> La **mensualidad de la academia** (servicio real) seguirá por Khipu/Mercado Pago — eso no cambia y
> **no** va por Play Billing.

---

## Notas técnicas (referencia)

- **Marca premium:** `students.premiumUntil` (fecha). Pro activo = `premiumUntil >= hoy`. Se expone como
  `isPremium`/`premiumUntil` en `GET /portal/me`.
- **Activación:** `PUT /students/{id}/premium` body `{ months }` (admin). `months>0` extiende desde la
  fecha mayor entre hoy y el vencimiento actual; `months<=0` lo quita.
- **Gating:**
  - La analítica de los bloques 2 y 3 se computa en el **cliente** sobre datos que el alumno ya posee
    (sus sesiones) → el gating es de **vista**.
  - El bloque 1 ("vs academia") expone agregados de otros, así que su endpoint
    `GET /portal/students/{id}/training/insights-pro` está **protegido server-side** (403 si no es Pro).
  - El bloque 4 (Insights IA) llama a una API de pago, así que también está **protegido server-side**.
- **Insights IA:** `CoachService` arma un resumen compacto de stats y llama a `AcademyChatService.complete`
  (reusa el ruteo Claude→Groq→Gemini). Cacheado en `students.coachInsight` + `students.coachInsightDate`
  (se regenera máx. 1 vez/día). Endpoints: `GET /portal/students/{id}/training/coach` (lee el cacheado, sin
  llamar IA) y `POST .../training/coach` (genera o devuelve el de hoy). Ambos **gated a Pro**.
- **Frontend:** vista en `frontend/src/pages/portal/sections/ProgressPro.tsx`; pestaña en `TrainingSection.tsx`;
  tarjeta admin en `pages/admin/StudentDetail.tsx`.
