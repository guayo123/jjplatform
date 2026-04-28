# Notas de Versión — JJPlatform
## Actualización: Abril 2026 (2)

---

## Nuevas funcionalidades — Segunda entrega

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
