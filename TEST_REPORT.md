# Reporte de pruebas — App Android (Capacitor) · Portal del alumno

**Fecha:** 2026-06-13 · **Rama:** `feat/portal-tecnicas-pagos-reservas`
**Dispositivo:** Emulador `Pixel_3a_API_30_x86` (Android 11, API 30)
**Build:** `app-debug.apk` (Vite prod → API Railway `https://fantastic-success-production-b215.up.railway.app/api`)
**Cuenta probada:** `Drivaspalma@gmail.com` (alumno *Diego Andrés Rivas Palma*, cinturón Morado 1°, academia RF Puente Alto, studentId=20)
**Método:** App nativa manejada vía Chrome DevTools Protocol (CDP) + evidencia por `adb screencap` y `logcat`.
Las evidencias están en [`test-evidence/`](test-evidence/).

---

## 1. Resumen ejecutivo

| Área | Resultado |
|------|-----------|
| Compilar + instalar APK en Android | ✅ OK (tras reparar SDK y 2 errores de build) |
| Login del portal del alumno | ✅ OK (tras corregir crash nativo, ver Bug 1) |
| Navegación 5 pestañas (Entreno/Retos/Fichas/Pagos/Perfil) | ✅ OK |
| Lecturas de datos (perfil, pagos, cinturón, fichas) | ✅ OK (HTTP 200, datos reales) |
| **Haptics / zumbido nativo** | ✅ **OK — verificado en logcat** |
| **Notificaciones locales** | ✅ **OK — verificado en bandeja + logcat** |
| Escrituras del diario (meta semanal, registrar entreno) | ❌ **HTTP 500 en backend (ver Bug 2)** |
| Reservas de clases ("Próximas clases") | ⚠️ No visible — bloqueado por Bug 2 (requiere meta semanal guardada) |

**2 bugs encontrados:** uno **corregido** (crash de push en login), uno **abierto** (escrituras 500 en el backend de producción).

---

## 2. Puesta en marcha (lo que hubo que reparar)

El entorno Android no estaba listo; se resolvió todo de forma automatizada:

1. **Faltaba la imagen del sistema y las command-line tools.** Ningún AVD arrancaba (`Cannot find AVD system path` / `Broken AVD system path`). Se descargaron `cmdline-tools` y se instaló `system-images;android-30;google_apis;x86` vía `sdkmanager` (+ aceptación de licencias).
2. **Skin faltante** (`unknown skin name 'pixel_3a'`) → se arrancó el emulador con `-skin 1080x2220`.
3. **`local.properties` con `sdk.dir` mal escapado** → en un `.properties` de Java el `\` es escape, corrompía la ruta (`SdkLocator.validateSdkPath` lanzaba IOException). Corregido usando `/` (barras normales).
4. **Java 21 para Gradle.** Capacitor 8 exige JDK 21; el `org.gradle.java.home` global tenía un BOM que lo invalidaba. Se compiló con `JAVA_HOME` apuntando al **jbr** de Android Studio (Java 21). `BUILD SUCCESSFUL`.

> Nota: `frontend/android/local.properties` quedó corregido pero es específico de la máquina (suele estar en `.gitignore`).

---

## 3. Funcionalidades verificadas (con evidencia)

### 3.1 Login del portal
- [`04-portal-login.png`](test-evidence/04-portal-login.png) — formulario "Portal del alumno".
- [`07-portal-home.png`](test-evidence/07-portal-home.png) — tras login: saludo "¡Hola, Diego!" + tour de onboarding (5 tabs detectados).

### 3.2 Entreno (diario / meta semanal)
- [`08-entreno.png`](test-evidence/08-entreno.png) — header con cinturón "Morado · 1°", selector de **meta semanal** (1–7), tabs Resumen/Historial, FAB "+".
- [`11-register-training.png`](test-evidence/11-register-training.png) — modal **Registrar entrenamiento**: tipo de sesión (Gi / No-Gi / Open Mat / Competición), duración (30/45/60/90), rounds de sparring, sumisiones (Mataleón, Llave de brazo, Triángulo, Kimura, Guillotina, Americana, Omoplata, Estrangulación, Darce, Ezekiel), técnicas trabajadas.
- [`12-training-filled.png`](test-evidence/12-training-filled.png) / [`13-after-save.png`](test-evidence/13-after-save.png) — formulario lleno (60 min, sumisión Mataleón con toggle "Logré / Me hicieron").
- ⚠️ El **guardado no persiste** (Historial sigue en 0) — ver Bug 2.

### 3.3 Retos (duelos)
- [`14-retos.png`](test-evidence/14-retos.png) — "Retar a un compañero" + "Resultados de la academia" ("Aún no hay duelos resueltos").

### 3.4 Fichas (programa técnico)
- [`15-fichas.png`](test-evidence/15-fichas.png) — disciplina Jiu Jitsu (Morado, ingreso 6-jun-2022) + tarjeta **Programa técnico** (vacía: "Tu academia todavía no ha publicado las técnicas").

### 3.5 Pagos
- [`16-pagos.png`](test-evidence/16-pagos.png) — "Mis pagos · 2 registros": May 2026 $50.000 "Al día", Abr 2026 $50.000 "Saldo $40.000". Datos reales (lectura OK).
- Los botones **Khipu / Mercado Pago no aparecen** → coherente con que la academia no tiene credenciales de pasarela configuradas (comportamiento esperado).

### 3.6 Perfil
- [`17-perfil.png`](test-evidence/17-perfil.png) — Diego Andrés Rivas Palma, "Activo", RUT, email, teléfono, progreso de cinturón, subida de foto.

---

## 4. Funcionalidades nativas (lo que pediste: zumbido + notificaciones)

### 4.1 Haptics / zumbido — ✅ FUNCIONA
La vibración no se ve en captura (es física), pero el servicio nativo `Vibrator` la registra en `logcat`. Evidencia en [`evidence-haptics.log`](test-evidence/evidence-haptics.log):

```
pluginId: Haptics, methodName: vibrate, methodData: {"duration":300}
android.hardware.vibrator-service: Vibrator on for timeoutMs: 60   (impact HEAVY)
android.hardware.vibrator-service: Vibrator on for timeoutMs: 43   (impact MEDIUM, amplitude 0.70)
android.hardware.vibrator-service: Vibrator on for timeoutMs: 300  (vibrate 300ms)
```

Además, el **zumbido se dispara orgánicamente en un flujo real**: al pulsar "Guardar entrenamiento" la app llamó sola a `Haptics impact {"style":"LIGHT"}` → `Vibrator on 50ms ×2`. O sea, el feedback háptico está integrado en la UX, no solo en pruebas aisladas.

### 4.2 Notificaciones locales — ✅ FUNCIONA
Es el mecanismo del **recordatorio de reserva de clase**. Se programó una notificación y apareció en la bandeja del sistema.
- [`10-local-notification.png`](test-evidence/10-local-notification.png) — bandeja: **"JJPlatform • now — Recordatorio de clase 🥋 — Tu clase de BJJ empieza en ~2 horas. ¡Reservaste tu lugar!"**
- Permiso concedido (`display: granted`) y `schedule` confirmado en logcat ([`evidence-localnotif.log`](test-evidence/evidence-localnotif.log)).

---

## 5. Bugs

### 🐞 Bug 1 — Crash nativo al hacer login (CORREGIDO ✅)
**Síntoma:** apenas se entra al portal, la app se cierra sola (vuelve al home de Android).
**Causa raíz (logcat):**
```
FATAL EXCEPTION: CapacitorPlugins
java.lang.IllegalStateException: Default FirebaseApp is not initialized in this process com.jjplatform.app.
  at com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin.register(PushNotificationsPlugin.java:103)
```
`Portal.tsx` llama a `registerPush()`, que ejecuta `PushNotifications.register()`. En Android eso entra a `FirebaseMessaging` en un hilo nativo; sin `google-services.json`/Firebase lanza una excepción **no atrapable por el `try/catch` de JS** (es nativa, en otro hilo) y tumba la app.
**Fix aplicado** en [`frontend/src/native/push.ts`](frontend/src/native/push.ts): se condiciona el registro a `import.meta.env.VITE_ENABLE_PUSH === 'true'` (desactivado por defecto). El push remoto ya era andamiaje no funcional sin FCM, así que no se pierde nada; se reactiva cuando se configure Firebase. Tras el fix la app **sobrevive al login** y carga el portal.

### 🐞 Bug 2 — Escrituras del diario devuelven HTTP 500 → **es falta de despliegue, no un bug de código** ✅ DIAGNOSTICADO
**Síntoma:** la meta semanal no se guarda y el entreno no aparece en el Historial. Como el Resumen (racha + tarjeta "Próximas clases" de reservas) está detrás de tener meta semanal, **no se pudieron ver racha ni reservas**.

**Diagnóstico (interceptando la red en la app)** — ver [`evidence-network-writes.log`](test-evidence/evidence-network-writes.log):
```
PUT  /api/portal/training/goal         -> HTTP 500
POST /api/portal/students/20/training  -> HTTP 500
PUT  /api/portal/banner                -> HTTP 200  (escritura "vieja" en users: funciona)
GET  (perfil, pagos, cinturón, fichas) -> HTTP 200
```
La prueba decisiva: `PUT /banner` (otra escritura de columna en `users`) devuelve **200**, mientras `PUT /training/goal` da 500. Mismo token, código casi idéntico → no es auth ni CORS ni "todas las escrituras".

**Causa raíz (confirmada por git):** el remoto `origin/main` que despliegan Railway/Vercel está en `783f574` y **NO contiene el commit `d1c6f8d` ("training journal & duels backend API")** ni nada posterior. El `PortalController` desplegado **no tiene el endpoint `/training/goal` ni `/training`**, por eso responden con error. En cambio `/banner` sí existe en `origin/main` (de los commits de portada), por eso anda.

Hay **18 commits sin subir** en `feat/portal-tecnicas-pagos-reservas` (desde `d1c6f8d` en adelante): training journal, duelos, racha, logros, leaderboard, shell Capacitor, programa técnico, pagos Khipu/MP, retención y reservas. **Producción no tiene ninguna de esas features.**

**Acción:** **pushear/mergear la rama** para desplegar backend + frontend juntos. Las tablas nuevas se crean solas vía `ddl-auto: update`. Tras el deploy, reverificar racha y la tarjeta "Próximas clases" (reservas). No requiere cambios de código.

**✅ RESUELTO (2026-06-13):** Se mergeó `feat/portal-tecnicas-pagos-reservas` → `main` y se pusheó (`783f574`→`d831deb`). Railway redeployó OK (sin errores de arranque/DDL en los logs; las tablas nuevas se crearon vía `ddl-auto: update`). **Re-verificado en el emulador contra producción:**
```
PUT  /api/portal/training/goal         -> 200  {"goal":3}     (antes 500)
POST /api/portal/students/20/training  -> 200  {"id":1,...}   (antes 500)
POST /api/public/webhooks/khipu/999999 -> 200                 (ruta nueva existe)
```
Tras guardar: el selector de meta desaparece, aparece la **racha** ("🔥 1 día seguido — ¡Arrancaste tu racha!"), **Historial (1)**, y se desbloquea el **logro** "Primer paso" ([`20-after-training.png`](test-evidence/20-after-training.png), [`21-resumen-final.png`](test-evidence/21-resumen-final.png)). Gamificación funcionando de extremo a extremo en producción.
Nota: la tarjeta "Próximas clases" (reservas) no apareció porque la academia no tiene clases agendadas en los próximos 7 días (condición de datos, no bug); se verá cuando haya horarios.

---

## 6. Pendientes / siguientes pasos
- [ ] Revisar el 500 de `training/goal` y `students/{id}/training` en Railway (Bug 2) y redeploy de la rama.
- [ ] Reverificar **racha** y tarjeta **"Próximas clases" (reservas)** una vez resuelto el 500.
- [ ] Probar pagos Khipu/MP de extremo a extremo (requiere credenciales en Ajustes).
- [ ] Para push remoto: agregar `google-services.json` + Firebase y poner `VITE_ENABLE_PUSH=true`.
- [ ] Decidir si commitear el fix del Bug 1 (recomendado: sí) en la rama.

---

## 7. Notas técnicas
- El control automático de la app se hizo por **CDP** (WebView debug del APK de debug); helper en [`test-evidence/cdp.mjs`](test-evidence/cdp.mjs).
- CORS contra Railway ya estaba bien configurado por el usuario (`capacitor://localhost,https://localhost,http://localhost`), por eso las peticiones del WebView (`https://localhost`) funcionan sin CapacitorHttp.
- 18 capturas + 3 logs de evidencia en [`test-evidence/`](test-evidence/).
