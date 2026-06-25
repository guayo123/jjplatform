# Pasos para subir JJPlatform a Google Play

Guía paso a paso para publicar **JJPlatform v1.6.0**. Los textos a pegar están en
[ficha-playstore.md](ficha-playstore.md).

---

## Fase 0 — Antes de entrar
Ten a mano (carpeta `playstore/` + el AAB):
- `jjplatform-v1.6.0.aab`
- `jjplatform_icon_512.png` (512×512)
- `jjplatform_feature_graphic.png` (1024×500)
- Las 3 capturas (`jjplatform_screenshot_1/2/3...`)

---

## Fase 1 — Crear la app
1. Entra a **Google Play Console** → **Crear app**.
2. Nombre: **JJPlatform** · Idioma predeterminado: **Español** · Tipo: **App** · **Gratis**.
3. Acepta las declaraciones y crea.

---

## Fase 2 — Configura la app (Dashboard / "Configura tu app")
Tareas obligatorias; las respuestas están en la ficha:

4. **Acceso a la app:** marca que requiere login → "Todas las funciones requieren credenciales".
   Da un **usuario/clave de prueba** de un alumno para que Google revise.
   ⚠️ Si no lo dejas, rechazan la app por "no podemos acceder".
5. **Anuncios:** No tiene anuncios.
6. **Clasificación de contenido:** llena el cuestionario con las respuestas de la ficha
   (sin violencia/sexual; **sí** compras in-app = pago de mensualidad; **sí** interacción entre usuarios).
7. **Público objetivo:** edad **13+** (interacción entre usuarios y datos personales/RUT).
8. **Seguridad de datos (Data safety):** copia la tabla de la ficha (nombre, correo, teléfono→Meta,
   RUT, pagos→Khipu/MercadoPago, token push→Firebase; cifrado en tránsito: sí; eliminación: sí vía correo).
9. **App de gobierno / finanzas / salud:** No.
10. **Política de privacidad:** `https://jjplatform.vercel.app/privacidad`

---

## Fase 3 — Ficha de Play Store (Store listing principal)
11. **Nombre:** JJPlatform
12. **Descripción corta** (80): pega la de la ficha.
13. **Descripción larga** (4000): pega el bloque completo.
14. **Ícono:** `jjplatform_icon_512.png`
15. **Gráfico destacado:** `jjplatform_feature_graphic.png`
16. **Capturas de teléfono:** sube las 3 (Play exige 2–8).
17. **Categoría:** Salud y bienestar · **Correo de contacto:** drivaspalma@gmail.com
18. Guarda.

---

## Fase 4 — Crear y subir el release
> Recomendado: primero **Prueba interna** (aprueba en minutos, lo instalas y verificas el ícono),
> y cuando esté ok lo promueves a **Producción**.

19. **Pruebas → Prueba interna → Crear versión** (o **Producción → Crear versión** si vas directo).
20. Acepta **Play App Signing** (Google gestiona la firma; tu AAB es el "upload key").
21. **Sube `jjplatform-v1.6.0.aab`.**
22. **Notas de la versión:** ej. *"Nuevo: ícono de la app según tu cinturón; correcciones al registrar
    acondicionamiento."*
23. **Revisar versión** → **Iniciar lanzamiento**.

---

## Fase 5 — Enviar a revisión
24. Cuando el Dashboard muestre todas las tareas en verde, pulsa **Enviar a revisión**.
25. Revisión típica: de unas horas a ~2–3 días la primera vez.

---

## ⚠️ Avisos importantes
1. **versionCode:** si Play rechaza el AAB diciendo que el `versionCode` ya existe, hay que
   incrementarlo en `frontend/android/app/build.gradle`, regenerar el AAB (`npm run aab:android`)
   y volver a subir. Para una primera subida no debería pasar.
2. **Usuario de prueba (paso 4):** es la causa #1 de rechazo en apps con login. Deja credenciales
   de un alumno real de prueba en "Acceso a la app".

---

## Comandos útiles (regenerar el AAB)
```bash
cd frontend
# JAVA_HOME al JDK 21 de Android Studio
export JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
npm run aab:android      # genera jjplatform-vX.Y.Z.aab firmado
```
