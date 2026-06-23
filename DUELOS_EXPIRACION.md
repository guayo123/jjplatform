# Expiración de duelos sin resolver

Cómo el sistema retira los duelos que se aceptaron pero nunca se concretaron, para que no
queden colgados para siempre en la tarjeta **"Duelos en juego"** del portal del alumno.

> **Importante:** el proceso **no borra** filas de la base de datos. Marca el duelo con el
> estado `EXPIRED` (lo "retira"). Así se conserva el historial y el duelo simplemente sale de
> las listas activas. Tampoco cuenta para el ranking.

---

## El problema que resuelve

Un duelo fluye así:

```
PENDING ──aceptar──▶ ACCEPTED ──reportar resultado──▶ COMPLETED
   │                     │
   └─rechazar/cancelar   └─ si nadie reporta… se quedaba atascado para siempre
```

Cuando un duelo tiene **árbitro**, solo el árbitro puede dar el veredicto. Si el árbitro no fue,
se olvidó o nunca reportó, el duelo quedaba congelado en *"Esperando el veredicto de…"* sin forma
de salir. Lo mismo si dos peleadores aceptan y nadie registra el marcador.

Hay **dos vías** para sacar un duelo aceptado de ese limbo:

1. **Cierre manual** por un participante (ver al final).
2. **Expiración automática** — el job que documenta este archivo.

---

## Qué hace el job

Recorre todos los duelos en estado `ACCEPTED` y, para cada uno, decide si ya está "vencido":

- **Fecha de referencia:** la **fecha pactada** del duelo (`scheduledAt`). Si el duelo no tenía
  fecha pactada, usa la **fecha en que se aceptó** (`respondedAt`).
- **Umbral:** si pasaron **más de 5 días** desde esa fecha de referencia, el duelo se considera
  vencido y pasa a `EXPIRED`.
- Si un duelo aceptado todavía no tiene fecha de referencia (caso muy raro), se deja intacto.

El número de días está en la constante `STALE_DAYS = 5` en
[`DuelService.java`](backend/src/main/java/com/jjplatform/api/service/DuelService.java).

### Ejemplo

| Duelo            | Fecha de referencia | Hoy es 23-jun | ¿Se expira?                |
|------------------|---------------------|---------------|----------------------------|
| vs Sebastián     | 20-jun (pactada)    | +3 días       | No (aún no pasan 5 días)   |
| vs Rodrigo       | 15-jun (pactada)    | +8 días       | **Sí** → `EXPIRED`         |
| vs Mauricio      | sin fecha, aceptado 12-jun | +11 días | **Sí** → `EXPIRED`         |

---

## Cuándo se ejecuta

- **Automático:** todos los días a las **03:00 (hora del servidor)**, en horario sin actividad.
  Lo dispara [`DuelExpiryJob`](backend/src/main/java/com/jjplatform/api/service/DuelExpiryJob.java)
  con `@Scheduled(cron = "0 0 3 * * *")`. Barre **todas las academias**.
- **Manual (admin):** desde el panel de administración, botón **"Limpiar duelos vencidos"** en el
  Dashboard. Corre el mismo barrido pero **solo para la academia del admin** que lo dispara, sin
  esperar a las 03:00.

---

## Cómo dispararlo manualmente desde el admin

1. Entra al panel de administración → **Dashboard** (inicio).
2. Abajo, en la tarjeta **"Mantenimiento de duelos ⚔️"**, toca **"Limpiar duelos vencidos"**.
3. Verás un aviso con cuántos duelos se expiraron (o que no había ninguno por limpiar).

Detrás, el botón llama a `POST /api/duels/maintenance/expire-stale`
([`DuelMaintenanceController`](backend/src/main/java/com/jjplatform/api/controller/DuelMaintenanceController.java)),
que está protegido para staff (ADMIN/PROFESOR/ENCARGADO) y limita el barrido a la academia actual.

---

## Mapa de archivos

| Pieza                  | Archivo                                                                                  |
|------------------------|------------------------------------------------------------------------------------------|
| Lógica de expiración   | `backend/.../service/DuelService.java` (`expireStale`, `expireStaleForAcademy`)          |
| Job diario 03:00       | `backend/.../service/DuelExpiryJob.java`                                                  |
| Endpoint admin manual  | `backend/.../controller/DuelMaintenanceController.java`                                   |
| Botón en el Dashboard  | `frontend/src/components/DuelMaintenanceCard.tsx`                                         |
| Estado `EXPIRED`       | `backend/.../model/Duel.java` (enum `Status`)                                             |
| Parche de esquema      | `backend/.../config/SchemaPatches.java` (suelta el CHECK obsoleto de `duels.status`)     |

---

## Cierre manual por el alumno (complemento)

Independiente del job, cualquiera de los **dos peleadores** (no el árbitro) puede cerrar un duelo
aceptado que no se hará, desde la tarjeta "Duelos en juego" → enlace **"¿No se hará? Cerrar duelo"**,
eligiendo una razón:

- 😅 **Me dio miedo**
- 📅 **Se pospuso**

Esto pasa el duelo a `CANCELLED` con la razón guardada (`closeReason`). Igual que `EXPIRED`, no
cuenta para el ranking. Endpoint: `POST /api/portal/students/{id}/duels/{duelId}/close`.

---

## Estados de un duelo (referencia)

| Estado      | Significado                                                            | ¿Cuenta ranking? |
|-------------|-----------------------------------------------------------------------|------------------|
| `PENDING`   | Reto enviado, esperando respuesta del rival                           | No               |
| `ACCEPTED`  | Aceptado, en juego, esperando resultado                               | No               |
| `COMPLETED` | Resultado registrado (ganador / empate)                               | **Sí**           |
| `REJECTED`  | El rival rechazó el reto                                              | No               |
| `CANCELLED` | Cancelado (reto pendiente) o cerrado por un participante con razón    | No               |
| `EXPIRED`   | Aceptado pero sin resolver tras 5 días — retirado por el barrido      | No               |
