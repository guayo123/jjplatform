# Notas de Versión — JJPlatform
## Última actualización: Mayo 2026

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
