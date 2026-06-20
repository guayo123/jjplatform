# Roadmap — JJPlatform

Estado del trabajo y lo que viene. Última actualización: 2026-06-14.

---

## ✅ Hecho y desplegado en producción

### 1. Programa técnico por cinturón
- Entidades `Technique` (atada a un `DisciplineBelt`) y `StudentTechnique` (marca "aprendida").
- **Admin**: gestión de técnicas por cinturón desde *Disciplinas* (botón 📋 en cada cinturón → modal `TechniqueManager`).
- **Alumno**: en *Fichas*, tarjeta "Programa técnico" con barra de progreso, cinturones en acordeón y check para marcar lo aprendido + enlace a video.

### 2. Pagos en línea (Khipu + Mercado Pago)
- Pasarelas con **confirmación automática por webhook** (no comprobante manual).
- **Alumno**: en *Pagos*, botones "Pagar con Khipu" / "Pagar con Mercado Pago" según lo configurado + datos de transferencia opcionales.
- **Backend**: `PaymentGatewayService` crea el checkout; webhooks públicos re-consultan la pasarela y marcan PAID.
- ⚠️ Falta pegar credenciales para que los botones aparezcan (ver "Pendiente").

### 3. Retención + recordatorio WhatsApp automático
- Detecta alumnos en riesgo: ≥21 días sin entrenar **o** mes sin pagar.
- Job diario que envía recordatorio por WhatsApp una vez al mes a morosos — **solo si la academia activa el toggle** (apagado por defecto).
- **Admin**: panel "Alumnos en riesgo" en el Dashboard con botón *Recordar* manual.

### 4. Reservas de clases con cupo + recordatorio
- `ClassSchedule` con **cupo** opcional (vacío = sin límite), editable en *Horarios*.
- **Alumno**: tarjeta "Próximas clases" (pestaña *Entreno*, ahora plegable) — reserva/cancela su lugar en los próximos 7 días; al reservar agenda una **notificación local** ~2h antes.
- **Admin**: roster de reservas por clase en *Horarios* (quién reservó cada día).

### 5. Diario de entrenamiento + data-viz (pestaña *Entreno*)
- Diario con meta semanal, racha (con recuperación), logros y ranking de academia.
- **Gráficos** computados en el cliente desde las sesiones del alumno: **horas por semana** (barras, 6 semanas), **asistencia** (heatmap estilo GitHub, 10 semanas) y **mapa de sumisiones** (logradas vs recibidas por técnica).

### 6. Rediseño del portal — tema "Ember" (en curso, rama `feat/portal-redesign-ember`)
- Tema oscuro Ember con sistema de tokens + selector de apariencia (Sistema · Ember · Claro · Clásico).
- Iconos SVG marciales propios en la barra, portadas vectoriales, skeleton loaders, transición de entrada.
- Toque premium: tipografía, textura, emblema de cinturón y sonido.
- Pulido reciente: FAB flotante corregido, franja de acento uniforme en tarjetas, "Próximas clases" plegable con ícono. **Cambios de UI aún sin commitear.**

---

## 🔧 Pendiente para producción

- [x] **Mergeado a `main` y pusheado** (2026-06-13, commit `d831deb`) → auto-deploy en Railway + Vercel.
- [x] **CORS Capacitor**: `capacitor://localhost,https://localhost,http://localhost` agregado a `CORS_ORIGINS` en Railway.
- [x] **Bug Android (crash de push)** corregido y commiteado.
- [x] **Acondicionamiento físico, PRs automáticos, diagrama muscular, mantenedor notificaciones** — mergeado 2026-06-20.
- [ ] **Credenciales de pasarela**: obtener y pegar en *Ajustes* la API Key de Khipu y el Access Token de Mercado Pago.
- [ ] **Probar los pagos de extremo a extremo** (sandbox primero).
- [ ] **Variable de entorno `PORTAL_URL`** en Railway (URL de retorno tras pagar). Tiene default, pero conviene fijarla.
- [ ] Configurar la **URL de notificación** en los paneles de Khipu/Mercado Pago si lo requieren (apunta a `APP_BASE_URL`).
- [x] CORS Capacitor — `capacitor://localhost,https://localhost,http://localhost` agregado a `CORS_ORIGINS` en Railway.

---

## 💡 Ideas futuras (sin construir)

| Idea | Valor | Notas |
|------|-------|-------|
| **Check-in por QR** | Alto | El alumno escanea un QR en el dojo → asistencia automática que alimenta racha/diario. La librería `qrcode` ya está. |
| **Reportes de ingresos** | Alto | Ahora que hay pagos online: ingresos del mes, % morosidad, conciliación por método. Trabajo de admin/web. |
| **Recibo automático de pago** | Medio | Al confirmar un pago, enviar comprobante por email/WhatsApp. |
| **Push remoto (FCM/APNs)** | Medio | Los recordatorios hoy son notificaciones locales; el remoto necesita Firebase/APNs + endpoint de tokens. |
| **Social entre alumnos** | Medio | Perfiles, reacciones a entrenamientos, ranking ampliado. |
| **Cumpleaños / hitos** | Bajo | Avisar al profe de cumpleaños y aniversarios de cinturón. |

---

## ✔️ Completado de la lista de ideas original
- **Mapa de sumisiones / data-viz** (era "Medio") → hecho en `abfb3bd`.
- **Roster admin de reservas** (era "Bajo") → hecho en `94206fd` + `4db2dcf`.
