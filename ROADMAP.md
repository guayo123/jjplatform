# Roadmap — JJPlatform

Estado del trabajo reciente y lo que viene. Última actualización: 2026-06-13.

---

## ✅ Hecho (en `main`, **sin commitear** todavía)

### 1. Programa técnico por cinturón
- Entidades `Technique` (atada a un `DisciplineBelt`) y `StudentTechnique` (marca "aprendida").
- **Admin**: gestión de técnicas por cinturón desde la página *Disciplinas* (botón 📋 en cada cinturón → modal `TechniqueManager`).
- **Alumno**: en la pestaña *Fichas*, tarjeta "Programa técnico" con barra de progreso, cinturones en acordeón y check para marcar lo aprendido + enlace a video.
- Endpoints: `/api/disciplines/belts/{beltId}/techniques`, `/api/techniques/{id}`, `/api/portal/students/{id}/techniques`.

### 2. Pagos en línea (Khipu + Mercado Pago)
- Ambos son **pasarelas con confirmación automática por webhook** (no comprobante manual).
- **Alumno**: en *Pagos*, botones "Pagar con Khipu" / "Pagar con Mercado Pago" (según lo configurado) + datos de transferencia opcionales.
- **Backend**: `PaymentGatewayService` crea el checkout; webhooks públicos `/api/public/webhooks/khipu/{paymentId}` y `/mp/{paymentId}` re-consultan la pasarela y marcan PAID.
- `Payment` con nuevo `status` (default `PAID`, así los pagos viejos quedan intactos), `method`, `gatewayPaymentId`.

### 3. Retención + recordatorio WhatsApp automático
- Detecta alumnos en riesgo: ≥21 días sin entrenar **o** mes sin pagar.
- Job diario (`PaymentReminderJob`) envía recordatorio por WhatsApp una vez al mes a los morosos — **solo si la academia activa el toggle** (apagado por defecto).
- **Admin**: panel "Alumnos en riesgo" en el Dashboard con botón *Recordar* manual.

### 4. Reservas de clases con cupo + recordatorio
- `ClassSchedule` ahora tiene **cupo** (opcional; vacío = sin límite), editable en *Horarios*.
- **Alumno**: tarjeta "Próximas clases" (pestaña *Entreno*) — reserva/cancela su lugar en las clases de los próximos 7 días; al reservar se agenda una **notificación local** ~2h antes (el push remoto sigue siendo solo andamiaje, requiere FCM/APNs).
- Roster (quién reservó) tiene endpoint listo (`/api/academy/schedules/{id}/reservations?date=`); su UI admin quedó **pendiente**.

---

## 🔧 Pendiente para producción

- [x] **Mergeado a `main` y pusheado** (2026-06-13, commit `d831deb`) → auto-deploy en Railway + Vercel. Antes de esto producción NO tenía nada de training/diario/técnicas/pagos/reservas (origin/main estaba en `783f574`).
- [x] **CORS Capacitor**: el usuario agregó `capacitor://localhost,https://localhost,http://localhost` a `CORS_ORIGINS` en Railway.
- [x] **Bug Android (crash de push)** corregido y commiteado (`registerPush` tras `VITE_ENABLE_PUSH`).
- [ ] **Reverificar tras el deploy**: meta semanal, registrar entreno (que daban 500 por estar sin desplegar), racha y tarjeta "Próximas clases" (reservas). Ver `TEST_REPORT.md`.
- [ ] **Credenciales de pasarela**: obtener y pegar en *Ajustes* la API Key de Khipu y el Access Token de Mercado Pago. Sin ellas los botones de pago no aparecen.
- [ ] **Probar los pagos de extremo a extremo** (en sandbox primero) — los flujos de pasarela aún no se han verificado por falta de credenciales.
- [ ] **Variable de entorno `PORTAL_URL`** en Railway (URL de retorno tras pagar). Tiene default, pero conviene fijarla.
- [ ] Configurar la **URL de notificación** en los paneles de Khipu/Mercado Pago si lo requieren (apunta a `APP_BASE_URL`).

---

## 💡 Ideas futuras (sin construir)

| Idea | Valor | Notas |
|------|-------|-------|
| **Check-in por QR** | Alto | El alumno escanea un QR en el dojo → asistencia automática que alimenta racha/diario. Ya está la librería `qrcode`. |
| **Reportes de ingresos** | Alto | Ahora que hay pagos online: ingresos del mes, % morosidad, conciliación por método. |
| **Recibo automático de pago** | Medio | Al confirmar un pago, enviar comprobante por email/WhatsApp. |
| **Push remoto (FCM/APNs)** | Medio | Los recordatorios hoy son notificaciones locales; el push remoto necesita Firebase/APNs + endpoint de tokens. |
| **Roster admin de reservas** | Bajo | UI para ver quién reservó cada clase (el endpoint ya existe). |
| **Mapa de sumisiones / stats** | Medio | Heatmap de sumisiones logradas/recibidas (ya se registran en el diario). |
| **Social entre alumnos** | Medio | Perfiles, reacciones a entrenamientos, ranking ampliado. |
| **Cumpleaños / hitos** | Bajo | Avisar al profe de cumpleaños y aniversarios de cinturón. |
