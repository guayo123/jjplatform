# Ficha de Google Play — JJPlatform

Datos listos para copiar/pegar en Google Play Console.

---

## Datos básicos

- **Nombre de la app (máx. 30):** `JJPlatform`
- **Categoría sugerida:** Salud y bienestar (alternativa: Deportes)
- **Tipo:** Aplicación (gratuita)
- **applicationId:** `com.jjplatform.app`
- **Política de privacidad:** https://jjplatform.vercel.app/privacidad
- **Correo de contacto:** drivaspalma@gmail.com

---

## Descripción corta (máx. 80 caracteres)

```
Tu academia de jiu-jitsu y MMA en el bolsillo: entrenos, retos y progreso.
```
(72 caracteres)

---

## Descripción larga (máx. 4000 caracteres)

```
JJPlatform es el portal del alumno para academias de jiu-jitsu, MMA y artes marciales. Lleva tu progreso, conéctate con tu academia y mantén la motivación arriba.

🥋 TU ENTRENAMIENTO, ORDENADO
• Registra tus sesiones de Gi, No-Gi, Open Mat, competencia y acondicionamiento físico.
• Lleva tus rounds, horas y ejercicios con series, repeticiones y kilos.
• Marca las técnicas que vas aprendiendo según tu cinturón.

🔥 RACHA Y METAS
• Define tu meta semanal y mantén tu racha de entrenamientos.
• Gana logros a medida que avanzas.
• Compite en el ranking de tu academia.

⚔️ RETOS ENTRE COMPAÑEROS
• Reta a tus compañeros a un duelo (sumisión, Combat JJ, MMA y más).
• Designa un árbitro y registra el resultado.
• Sigue los resultados de toda la academia.

📊 TU PROGRESO A LA VISTA
• Sigue tu peso corporal con gráficos.
• Revisa tu cinturón, grados y tus resultados en torneos.
• Consulta los próximos horarios y reserva tu cupo.

💳 PAGOS Y AVISOS
• Revisa el estado de tu mensualidad y paga en línea.
• Recibe recordatorios y avisos de tu academia.

🔔 NOTIFICACIONES
• Entérate al instante de retos, clases y novedades.

Pensada para alumnos y academias que quieren digitalizar su día a día y mantener viva la comunidad dentro y fuera del tatami.

Nota: JJPlatform funciona junto a tu academia. Necesitas estar inscrito en una academia que use la plataforma para acceder con tu cuenta.
```

---

## Gráficos (ya generados en /playstore)

| Asset | Archivo | Dimensión |
|---|---|---|
| Ícono | `jjplatform_icon_512.png` | 512×512 |
| Gráfico destacado | `jjplatform_feature_graphic.png` | 1024×500 |
| Captura 1 | `jjplatform_screenshot_1.png` | 1080×1920 (1.78:1) |
| Captura 2 (Entreno) | `jjplatform_screenshot_2_entreno_2x1.jpeg` | 800×1600 (2:1) |
| Captura 3 (Retos) | `jjplatform_screenshot_3_retos_2x1.jpeg` | 800×1600 (2:1) |

✅ 3 capturas válidas (Play exige 2–8). Las 2 nativas venían a 720×1600 (2.22:1, sobre el límite
2:1 de Play) y se ajustaron a 800×1600 con barras laterales del color de fondo, sin recortar.

---

## Clasificación de contenido (cuestionario)

Respuestas sugeridas (app sin contenido sensible):

- ¿Violencia? **No** (es seguimiento deportivo, no representa violencia).
- ¿Contenido sexual? **No**
- ¿Lenguaje ofensivo? **No**
- ¿Drogas/alcohol/tabaco? **No**
- ¿Juegos de azar / apuestas? **No** (los "duelos" son retos deportivos, sin dinero).
- ¿Compras dentro de la app? **Sí** — la app permite pagar la mensualidad (pagos a la academia, no bienes digitales).
- ¿Comparte ubicación? **No**
- ¿Interacción entre usuarios (UGC)? **Sí** — retos y mensajes entre compañeros de la misma academia.

Resultado esperado: apta para todo público / PEGI 3 aprox.

---

## Seguridad de datos (Data safety)

Declarar que la app **recolecta y procesa**:

| Tipo de dato | ¿Recolectado? | ¿Compartido? | Propósito |
|---|---|---|---|
| Nombre | Sí | No | Funcionalidad de la app, cuenta |
| Correo electrónico | Sí | No | Cuenta, comunicaciones |
| Teléfono | Sí | Sí (WhatsApp/Meta para avisos) | Comunicaciones |
| ID nacional (RUT) | Sí | No | Identificación del alumno |
| Fecha de nacimiento | Sí | No | Perfil / cumpleaños |
| Fotos | Sí | No | Foto de perfil |
| Info de pagos | Sí | Sí (Khipu / Mercado Pago) | Procesar pagos |
| Actividad en la app | Sí | No | Funcionalidad (entrenos, retos) |
| ID de dispositivo / token push | Sí | Sí (Firebase) | Notificaciones |

- **¿Cifrado en tránsito?** Sí (HTTPS).
- **¿El usuario puede pedir eliminación de datos?** Sí → vía correo (descrito en la política).
- **Prácticas de seguridad:** datos cifrados en tránsito; contraseñas cifradas.

---

## Checklist de publicación

- [x] AAB firmado (`jjplatform-v1.6.0.aab`)
- [x] Ícono 512×512
- [x] Gráfico destacado 1024×500
- [x] Política de privacidad pública
- [x] Descripción corta y larga
- [x] Capturas de pantalla (3 listas)
- [ ] Cuestionario de clasificación de contenido (en Play Console)
- [ ] Formulario de Seguridad de datos (en Play Console)
- [ ] País/precio (gratis) y distribución
- [ ] Subir AAB a un track (prueba interna → producción)
