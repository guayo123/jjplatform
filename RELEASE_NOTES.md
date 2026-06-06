# Notas de Versión — JJPlatform
## Última actualización: Junio 2026

---

## Actualización — Junio 2026

### Portal del Alumno — Cuenta y autogestión
- Los alumnos pueden **crear su propia cuenta** desde el login ("¿Eres alumno? Crea tu cuenta de alumno" → `/portal/registro`)
- Se identifican con **RUT + email**: el sistema busca su ficha de alumno y, si coincide, crea una cuenta con rol `STUDENT` y le envía una **clave temporal por correo** (mismo flujo que el staff; en desarrollo la clave se imprime en la consola del backend)
- El primer ingreso obliga a **cambiar la clave** antes de entrar al portal
- **Portal de solo lectura** (`/portal`) donde el alumno ve su ficha completa: foto, datos personales, cinturones por disciplina, historial de graduaciones, resultados de torneos, planes/profesores y pagos
- El alumno puede **editar su foto de perfil** (único campo editable desde el portal)
- **Multi-academia**: si la misma persona (mismo RUT+correo) es alumno en varias academias, una sola cuenta agrupa todas sus fichas y un **selector** permite cambiar entre ellas
- Nuevo rol `STUDENT` y vínculo `students.user_id` (ManyToOne: varias fichas → un login)
- Endpoints nuevos bajo `/api/portal/**` (solo rol `STUDENT`) que resuelven la ficha **desde el usuario logueado** y verifican que le pertenece, nunca por id del cliente
- Re-registrarse con el mismo RUT+correo actúa como **recuperación de acceso**: reenvía una clave temporal y vincula las academias nuevas
- **Nota de base de datos**: el rol `STUDENT` requiere ampliar el CHECK constraint de `users.role` (`ALTER TABLE users DROP CONSTRAINT users_role_check; ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN','SUPER_ADMIN','PROFESOR','ENCARGADO','STUDENT'))`). Aplicar una vez por entorno.

### RUT — Formateo y comparación tolerante a formato
- El campo de RUT en el registro se **formatea en vivo** (`12.345.678-9`) pero se envía **limpio** a la API (sin puntos ni guion, con la K en mayúscula). Utilidad reutilizable `cleanRut` / `formatRut`
- La validación del RUT al registrarse **normaliza ambos lados** (lo ingresado y lo guardado en BD), por lo que coincide sin importar el formato con que esté cargado

### Ayuda guiada — Tours interactivos
- Tours paso a paso con **Driver.js** que oscurecen la pantalla, resaltan el elemento real y explican **dónde hacer clic**
- Aparecen **automáticamente la primera vez** que se entra a cada pantalla; botón **?** en el encabezado para reabrirlos cuando se quiera; checkbox **"No volver a mostrar"**
- **Cada funcionalidad tiene su propia clave** en `localStorage` (ej: `jjp_payments_tour`, `jjp_students_tour`), así desactivar el tour de una pantalla no afecta a las demás
- Cubre el **portal del alumno** y todas las pantallas de administración:
  - **Dashboard** (navegación), **Alumnos** (crear, exportar Excel/PDF, filtros, ver detalle, editar)
  - **Ficha del alumno** (editar, agregar disciplina, cinturón, grados, torneos, historial)
  - **Pagos**, **Torneos**, **Profesores**, **Usuarios**, **Planes**, **Disciplinas**, **Horarios**, **Fotos** y **Configuración**
- Estilo de botones del tour alineado al de la app (clase `jjp-tour`)
- Implementación reutilizable: helper `runGuidedTour` + hook `useGuidedTour` (auto-inicio robusto en el flanco de carga, compatible con React StrictMode)

### Correcciones
- **Cambio de contraseña**: el endpoint `POST /api/auth/change-password` resolvía mal al usuario autenticado (usaba `auth.getName()`, que devolvía el `toString()` del objeto `User` en vez del email) y respondía "Usuario no encontrado". Ahora lee el email directamente del principal `User`. Afectaba a **todos los roles**.
- **Layout del portal**: la foto de perfil se desbordaba sobre el nombre/academia; se corrigió el ancho del contenedor.

---

## Actualización — Mayo 2026 (segunda parte)

### Cuentas de staff con clave temporal por correo
- Al crear un **Encargado** desde la pantalla *Usuarios*, ya no se ingresa la contraseña manualmente: el sistema genera una clave temporal aleatoria de 12 caracteres y la envía por correo al usuario
- Si el SMTP no está configurado (entorno de desarrollo), la clave se imprime en la consola del backend con un log claro
- El alfabeto excluye caracteres ambiguos (`0/O`, `1/l/I`) para que la clave sea legible desde el correo
- Integración con **Brevo (ex-Sendinblue)** como proveedor SMTP gratis hasta 300 correos/día; se cambia de proveedor solo editando variables de entorno

### Cambio de contraseña obligatorio en primer login
- Las cuentas creadas con clave temporal quedan marcadas con `must_change_password`
- Al iniciar sesión, el frontend bloquea toda la app y redirige a `/admin/change-password` hasta que el usuario defina su clave definitiva
- Nuevo endpoint `POST /api/auth/change-password` y nueva pantalla del mismo nombre con validación de complementarios (clave actual + nueva + confirmación)

### Profesores — Acceso al sistema desde la ficha
- Nuevo campo **Email de contacto** en el formulario de profesor (con fallback al email del alumno vinculado si el profesor no tiene uno propio)
- Nuevos botones en cada tarjeta de profesor:
  - **Dar acceso** — Crea la cuenta de login con clave temporal y la envía al correo del profesor. Deshabilitado si no hay email disponible.
  - **Reenviar clave** — Regenera la clave temporal cuando el profesor la pierde (la anterior queda inválida)
- Badge **"Acceso al sistema"** en las tarjetas para identificar rápido qué profesores tienen cuenta
- La cuenta queda enlazada al profesor vía `professors.user_id`
- Ambas acciones solo pueden ejecutarlas usuarios con rol `ADMIN`
- La pantalla *Usuarios* ya **no** permite crear profesores (queda limitada a Encargados) para evitar duplicar caminos

### Validación de imágenes con perfiles por contexto
- Cada uso de imagen aplica un perfil específico con restricciones de peso y dimensiones:

  | Perfil | Uso | Peso máx | Dimensiones |
  |---|---|---|---|
  | Logo | Logo de academia | 1 MB | 100×100 a 1024×1024 px |
  | Perfil | Foto de alumno o profesor | 2 MB | 200×200 a 3000×3000 px |
  | Galería | Foto de galería pública | 5 MB | 600×400 a 4000×4000 px |

- **Magic-byte sniffing**: el backend lee los primeros bytes del archivo y verifica que sea realmente JPEG/PNG/GIF/WebP, sin confiar en el `Content-Type` que envía el navegador
- **Validación previa en el frontend**: el navegador decodifica la imagen y verifica peso/formato/dimensiones *antes* de subir, mostrando un mensaje claro con la regla incumplida ("La imagen supera el peso máximo (2 MB)", "Imagen demasiado pequeña: 150×150. Mínimo 200×200 px", etc.)
- **Restricciones visibles**: bajo cada zona de upload se muestra el detalle del perfil (formatos, peso y dimensiones aceptados)
- Barra de progreso real durante la subida en logo, fotos de alumnos/profesores y galería
- **Fix**: el endpoint de descarga ahora devuelve el `Content-Type` real (JPEG/PNG/GIF/WebP) en lugar de fijarlo a `image/jpeg`; los PNG con transparencia y los WebP se muestran correctamente. Se agregó `Cache-Control` de 30 días.

---

## Refinamientos de cierre — Mayo 2026 (21–22)

### Tarjeta de disciplina del alumno — Edición de cinturón
- Se eliminó el botón directo de "lápiz" en la tarjeta de disciplina para corregir el cinturón
- La corrección ahora se hace vía el flujo formal de **promoción de cinturón**, manteniendo el historial auditable

### Backfill de Jiu Jitsu para todos los alumnos
- El proceso de inscripción automática en Jiu Jitsu ahora cubre a **todos los alumnos**, no solo a los que ya tenían un cinturón asignado
- Garantiza que cada alumno tenga una ficha de disciplina aunque su cinturón inicial esté sin asignar

### Corrección — Bracket de torneos
- Solucionado un caso donde el avance automático por *bye* fallaba al participante en un slot duplicado

---

## Actualización — Mayo 2026

### Disciplinas — Categorías de edad y cinturones configurables
- Cada disciplina ahora se organiza en **categorías de edad** (ej: Niños, Adultos, General), cada una con su propio rango de edad (mínima/máxima)
- Cada categoría tiene su **progresión de cinturones** independiente, con nombre, color (hex) y orden de visualización
- Desde el panel **Disciplinas** se pueden crear, editar, eliminar y reordenar categorías y cinturones
- Nuevas tablas: `discipline_age_categories` y `discipline_belts`
- Endpoints nuevos en `DisciplineBeltController` (`/api/disciplines/{id}/categories`, `/categories/{id}/belts`, etc.)

### Jiu Jitsu predefinido — Categorías y cinturones IBJJF
- Al registrar una academia se siembra **Jiu Jitsu** con dos categorías:
  - **Niños (4–15 años):** Blanco, Gris, Amarillo, Naranja, Verde
  - **Adultos (16+ años):** Blanco, Azul, Morado, Café, Negro, Rojo y Negro, Rojo y Blanco, Rojo
- Edades mínimas alineadas a IBJJF
- Sembrado idempotente vía `DefaultDisciplineService.createJiuJitsuIfAbsent`

### Disciplinas predefinidas — Kickboxing
- Al registrar una academia, además de **Jiu Jitsu** ahora se siembra automáticamente la disciplina **Kickboxing**
- Cinturones configurados en una categoría **General** (sin restricción de edad): Blanco, Amarillo, Naranja, Verde, Azul, Café y Negro
- Sembrado idempotente: en cada arranque del backend se aplica a las academias existentes sin duplicar datos
- La carga se realiza vía `DefaultDisciplineService.createKickboxingIfAbsent` invocada desde `DataSeeder` (academias existentes) y desde `AuthService.register` (academias nuevas)

### Alumnos — Inscripción por disciplina
- Un alumno puede inscribirse en **varias disciplinas**, cada una con su propio cinturón, rayas (stripes), categoría de edad y fecha de ingreso
- Nueva tabla `student_disciplines` con restricción única por alumno + disciplina
- El detalle del alumno (`StudentDetail`) se rediseñó para mostrar y gestionar las disciplinas inscritas
- El listado de alumnos muestra el cinturón por disciplina (`disciplineBelts` en `StudentDto`)
- Endpoints nuevos en `StudentDisciplineController` (`/api/students/{id}/disciplines`)

### Cinturones — Historial de promoción por disciplina
- Las promociones de cinturón ahora se asocian a una **disciplina específica del alumno** (`StudentDiscipline`), no solo al alumno global
- El orden de cinturones para detectar promoción/grado/degradación se resuelve desde la categoría de edad de la disciplina (con un orden por defecto como respaldo)
- La anulación en cascada y el recálculo del cinturón vigente operan por disciplina
- Se mantiene la compatibilidad con las promociones globales antiguas (`studentDiscipline = null`)

### Resultados de competencias
- Se pueden registrar **resultados de torneos** por disciplina del alumno: nombre del torneo, fecha, puesto, categoría y notas
- Cada resultado guarda un **snapshot del cinturón y rayas** del alumno al momento de competir
- Nueva tabla `competition_results`

### Profesores — Vínculo con alumno y disciplina
- El profesor puede vincularse a un registro de **alumno** (para reutilizar su historial de cinturón) y a una **disciplina**
- Se eliminó el campo de texto libre `belt` del profesor en favor del historial real
- El listado de alumnos excluye los "alumnos sombra" creados solo para respaldar el historial de un profesor

### Diseño "Dojo" — Componentes de formulario unificados
- Se crearon componentes reutilizables con estilo oscuro consistente: `FormInput`, `FormSelect`, `FormTextarea`
- Todos los formularios del panel admin (Alumnos, Profesores, Planes, Horarios, Pagos, Torneos, Usuarios, Disciplinas, Configuración) actualizados al nuevo estilo
- Nuevo componente `DatePicker` personalizado (sin librerías externas): calendario en español, lunes primero, indicador de hoy, acceso rápido "Hoy"
- Nuevo componente `ImageUpload` con drag & drop, vista previa, botón de remover y spinner de carga

### Alumno — Plan y profesor asignado
- En el detalle de alumno, nueva sección **"Planes y Profesores"** que muestra cada plan contratado con su disciplina, precio mensual y el profesor que lo dicta
- El backend ahora retorna `professorId` y `professorName` dentro de `enrolledPlans`

### Perfil público — Acceso rápido a Planes
- Se agregó el botón **Planes** en la fila de accesos rápidos del perfil público, junto a Clases, Torneos y Fotos
- Solo aparece si la academia tiene planes configurados y lleva al ancla correspondiente en la página

### Navegación — Footer y botón Volver
- Nuevo `Footer` reutilizable visible en todos los módulos del panel admin
- Nuevo `BackButton` inteligente: aparece automáticamente en subrutas con destino calculado según la jerarquía de rutas (no depende del historial del navegador)
  - En móvil: solo ícono circular
  - En escritorio: ícono + etiqueta de la sección padre

---

## WhatsApp Chatbot, Exportaciones y Auditoría — Mayo 2026 (10–11)

### Chatbot por WhatsApp — Modo público
- Las academias pueden conectar su número de WhatsApp para que los **alumnos y prospectos** consulten información de la academia
- El bot responde sobre **horarios, planes, profesores, disciplinas, fotos de la galería** y datos generales de la academia
- Configuración por academia: `wpPhoneNumberId`, `wpAccessToken`, `wpVerifyToken` desde la pantalla de *Configuración*

### Chatbot por WhatsApp — Modo administrador
- Los administradores autorizados (`wpAdminPhones`) pueden hacer **consultas internas** desde su WhatsApp
- Preguntar por estado de un alumno: cinturón actual, peso, edad, pagos pendientes/al día, plan inscrito
- El prompt fue refinado iterativamente para garantizar que el bot tenga acceso a horarios, planes, profesores y alumnos, en el orden correcto, y use los datos correctos según la consulta (ej: cinturón se busca en alumnos, no en profesores)

### Exportaciones PDF / Excel
- Nuevo botón **Exportar** en el reporte de pagos y en el listado de alumnos
- Genera PDF o Excel con la información formateada para presentar o archivar

### Historial completo de promociones de cinturón con auditoría
- Cada promoción registra **quién la realizó** (`performedBy`)
- Las anulaciones quedan registradas con motivo, fecha y autor (**soft-delete con audit trail**, no se borra físicamente)
- La anulación de una promoción dispara un **recálculo en cascada**: las promociones posteriores se reajustan y el cinturón vigente del alumno se reasigna automáticamente
- Si el alumno no tiene promociones activas, se permite reasignar el cinturón inicial

### DatePicker — Selector rápido de año
- Click en el año del calendario abre un selector de año
- Útil para registrar fecha de nacimiento de alumnos adultos sin tener que avanzar mes a mes

### Optimización del bot (Groq)
- Cambio a **llama-3.1-8b-instant** (500K tokens diarios gratis en plan free)
- `max_tokens` ajustado a 768–1024 según el caso para responder completo sin cortar

### Correcciones varias
- Promoción inicial de cinturón se crea al registrar al alumno
- Validaciones obligatorias en el formulario de alumno
- Fix de desfase de zona horaria en fechas (la fecha guardada coincide con la elegida)
- Fix de ancho del `FormSelect` cuando se anidaba con clases conflictivas
- Fix del campo de descuento en el registro de pagos

---

## Nuevas funcionalidades — Tercera entrega (Abril 2026)

### Horarios — Profesor por horario
- Cada horario puede tener un **profesor propio** independiente del plan
- Al crear o editar un horario, un selector permite elegir cualquier profesor activo
- Si no se elige uno, se usa el profesor del plan como valor por defecto
- El perfil público refleja correctamente el profesor asignado al horario específico
- Los profesores asignados a horarios aparecen ahora con sus disciplinas y clases en sus tarjetas del perfil público

### Corrección — Perfil público: 404 al refrescar
- Configurado el rewrite en Vercel para que al refrescar cualquier ruta (ej: `/admin/students`) no devuelva 404
- React Router ahora maneja correctamente todas las rutas desde `index.html`

---

## Cinturones, galería y refinamientos visuales — Abril 2026 (22–24)

### Promociones de cinturón con rayas (stripes)
- Cada promoción registra cinturón **y** rayas (0 a 4)
- El sistema detecta automáticamente si la operación es **promoción**, **degradación** o **asignación de rayas (grado)** comparando con el cinturón anterior
- Las rayas se asignan vía `BeltPromotionService` (no se editan manualmente en el formulario de alumno)

### Detalle de alumno rediseñado
- Vista dedicada con foto grande, datos personales, planes inscritos, historial de pagos e historial de cinturones
- Acciones rápidas para registrar pago, abonar, promocionar cinturón y editar datos

### Filtros de búsqueda en alumnos
- Búsqueda por nombre, RUT o nickname
- Filtros adicionales por estado (activo/inactivo) y otros criterios

### Galería del perfil público — Carrusel de fotos
- Las fotos de la galería se muestran como **carrusel deslizable** en lugar de una grilla estática
- En móvil: gestos táctiles; en escritorio: flechas y autoplay opcional

### Anclas de scroll en el perfil público
- Los accesos rápidos (Clases, Planes, Torneos, Fotos) saltan a la sección correspondiente con scroll suave

### Horarios — Vista por chip de día e íconos
- Se reemplazó la grilla semanal por una fila de **chips por día**
- Cada clase muestra un ícono representativo del tipo de actividad

### Correcciones
- **Login case-insensitive**: el email se normaliza en minúsculas al loguearse y registrarse
- **Navegación**: links de la barra superior con scroll horizontal en móvil y secundarios agrupados bajo un menú "Gestión" para evitar overflow
- **Perfil dev**: nuevo `application-dev.yml` para diferenciar entornos de desarrollo

---

## Nuevas funcionalidades — Segunda entrega (Abril 2026)

### Pagos — Vista "Por plan"
- Nueva vista en la sección Pagos accesible desde el toggle **"Por mes" / "Por plan"**
- Permite seleccionar cualquier plan (agrupados por disciplina) y ver en el mes elegido:
  - **Verde** — Alumnos que pagaron completo
  - **Naranja** — Alumnos con abono parcial (incluye botón para completar el pago)
  - **Rojo** — Alumnos con pago pendiente
- Contadores de resumen (Pagados / Abonos / Pendientes) en el encabezado de la vista
- El selector de mes y año aplica en ambas vistas

### Planes — Filtro por estado
- Nuevo filtro en la parte superior de Planes y Tarifas: **Todos / Activos / Inactivos**
- Cada botón muestra el conteo de planes en ese estado
- Los planes inactivos siguen visibles para consulta y pueden reactivarse en cualquier momento

### Horarios — Nombre personalizable de clase
- Al crear o editar un horario, el campo **"Nombre de la clase"** se precarga automáticamente con el nombre del plan asignado
- Se puede editar libremente para reflejar la modalidad específica (ej: "NOGI", "BJJ Kimono", "Grappling")
- Permite que un mismo plan cubra distintas modalidades de clase sin necesidad de crear planes duplicados

### Panel de bienvenida — Accesos directos completos
- Se agregaron las tarjetas de **Profesores** y **Disciplinas** al dashboard de inicio
- Ahora el panel muestra acceso directo a todas las secciones del sistema

---

## Resumen ejecutivo

Esta actualización incorpora la gestión completa de **Disciplinas**, **Profesores** y **Planes**, conectados entre sí para formar el núcleo del modelo de negocio de la academia. Además se rediseñó el sistema de pagos con soporte de abonos, descuentos y seguimiento por alumno.

---

## Nuevas funcionalidades

### Disciplinas
- Nueva sección en el panel de administración para crear y gestionar disciplinas (Jiu-Jitsu, Grappling, Kickboxing, etc.)
- Cada disciplina puede activarse o desactivarse

### Profesores
- Nueva sección para registrar profesores con foto, biografía, cinturón/grado y logros/títulos
- Los profesores se vinculan a los planes que dictan
- Orden de visualización configurable para controlar cómo aparecen en el perfil público

### Perfil público — Sección de Profesores
- Tarjetas visuales con foto grande en formato vertical
- Badge de cinturón con los colores oficiales de BJJ (blanco, azul, morado, marrón, negro)
- En móvil: carrusel deslizable (Swiper)
- En escritorio: grilla de tarjetas
- Al hacer clic: modal con foto ampliada, biografía completa, logros y planes que dicta
- Filtro por disciplina: aparecen tabs automáticamente si hay disciplinas asignadas

### Planes mejorados
- Cada plan puede vincularse a una **Disciplina** y a un **Profesor**
- El perfil público agrupa los planes por disciplina con tabs de filtro
- Badge "Más Popular" configurable por orden de visualización

### Inscripción de alumnos en planes
- Desde el formulario del alumno es posible seleccionar uno o varios planes
- Los planes se agrupan visualmente por disciplina
- Solo se muestran planes activos para asignación

---

## Sistema de Pagos — Rediseño completo

### Registro de pagos
- Calcula automáticamente el monto esperado sumando los planes activos del alumno
- Soporta **pago completo** o **abono parcial**
- Descuento configurable en **pesos ($)** o **porcentaje (%)**
- Validación: no se puede registrar un pago que supere el monto esperado
- Detalle visual de los planes con desglose del descuento en color naranja

### Abonos
- Los pagos parciales quedan registrados con el monto pendiente
- Botón "Abonar" disponible en el listado mensual y en el reporte
- Validación: el abono no puede superar el monto pendiente restante

### Estados de pago
- **Verde — Pago completo:** el alumno pagó el neto total
- **Naranja — Abono:** pagó parcialmente, se muestra el monto pendiente
- **Rojo — Pendiente:** sin registro de pago en el mes
- **Azul — Exento:** descuento cubre el 100% del monto (sin cobro)

### Reporte anual
- Tabla matricial alumno × mes con montos pagados
- Badge especial "Exento" para meses con descuento total
- Totales por mes y total anual

### Permisos
- Los perfiles **Profesor** y **Encargado** ahora pueden registrar, abonar y eliminar pagos

---

## Correcciones

| Problema | Solución |
|---|---|
| Fotos de profesores y alumnos aparecían en la galería pública | El endpoint de subida acepta `gallery=false`; el perfil público filtra URLs de perfil |
| Los planes inactivos se asignaban a alumnos y afectaban el cálculo de pagos | Solo se muestran y calculan planes con estado activo |
| El monto esperado aparecía vacío al registrar un pago | Se corrigió la carga de planes del alumno con JOIN FETCH en la consulta |
| Diferencia de 1 peso en el cálculo | Unificado a redondeo entero (CLP no tiene centavos) |
| Al editar un alumno no se mostraban sus planes | Se agregó `@Transactional` al servicio para inicializar la colección lazy |

---

## Acceso a las nuevas secciones

Desde el panel de administración (menú lateral):

- **Disciplinas** → Crear y gestionar disciplinas
- **Profesores** → Registrar profesores, asignar foto y logros
- **Planes** → Vincular cada plan a una disciplina y profesor
- **Alumnos → Editar** → Seleccionar planes inscritos
- **Pagos** → Registrar pagos mensuales con detalle de planes

---

*JJPlatform · https://jjplatform.vercel.app*
