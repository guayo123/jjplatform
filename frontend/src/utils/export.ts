import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Student, Payment, BeltPromotion } from '../types';

const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const TYPE_LABEL: Record<string, string> = {
  PROMOCION: 'Promocion',
  DEGRADACION: 'Degradacion',
  GRADO: 'Grado',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatClp(n: number | null | undefined): string {
  if (n == null) return '—';
  return '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

// ── Students ─────────────────────────────────────────────────────────────────

function studentsToRows(students: Student[]) {
  return students.map((s) => ({
    Nombre: s.name,
    Apodo: s.nickname ?? '',
    RUT: s.rut ?? '',
    Email: s.email ?? '',
    Telefono: s.phone ?? '',
    'Tel. Emergencia': s.emergencyPhone ?? '',
    Edad: s.age ?? '',
    'Peso (kg)': s.weight ?? '',
    Cinturon: s.belt ?? '',
    Grados: s.stripes ?? '',
    Estado: s.active ? 'Activo' : 'Inactivo',
    'Fecha ingreso': s.joinDate?.slice(0, 10) ?? '',
    Planes: s.enrolledPlans?.map((p) => p.name).join(', ') ?? '',
  }));
}

function promotionsToRows(promotions: BeltPromotion[]) {
  return promotions
    .filter((p) => !p.deleted)
    .map((p) => ({
      Alumno: p.studentName,
      Tipo: TYPE_LABEL[p.type] ?? p.type,
      'Cinturon desde': p.fromBelt ?? '—',
      'Grados desde': p.fromStripes ?? '—',
      'Cinturon hasta': p.toBelt,
      'Grados hasta': p.toStripes,
      Fecha: p.promotionDate?.slice(0, 10) ?? '',
      Notas: p.notes ?? '',
      'Registrado por': p.performedBy ?? '',
    }));
}

export function exportStudentsExcel(
  students: Student[],
  promotions: BeltPromotion[] = [],
  filename = 'alumnos',
) {
  const wb = XLSX.utils.book_new();

  const wsAlumnos = XLSX.utils.json_to_sheet(studentsToRows(students));
  XLSX.utils.book_append_sheet(wb, wsAlumnos, 'Alumnos');

  const studentIds = new Set(students.map((s) => s.id));
  const filtered = promotions.filter((p) => studentIds.has(p.studentId));
  if (filtered.length > 0) {
    const wsGrad = XLSX.utils.json_to_sheet(promotionsToRows(filtered));
    XLSX.utils.book_append_sheet(wb, wsGrad, 'Graduaciones');
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportStudentsPDF(
  students: Student[],
  promotions: BeltPromotion[] = [],
  filename = 'alumnos',
) {
  const doc = new jsPDF({ orientation: 'landscape' });

  // ── Página 1: listado de alumnos ─────────────────────────────────────────
  doc.setFontSize(14);
  doc.setTextColor(30);
  doc.text('Listado de Alumnos', 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Total: ${students.length} alumno${students.length !== 1 ? 's' : ''}`, 14, 22);

  autoTable(doc, {
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    head: [['Nombre', 'RUT', 'Email', 'Edad', 'Peso', 'Cinturon', 'Grados', 'Estado', 'F. Ingreso', 'Planes']],
    body: students.map((s) => [
      s.name,
      s.rut ?? '—',
      s.email ?? '—',
      s.age ?? '—',
      s.weight != null ? `${s.weight} kg` : '—',
      s.belt ?? '—',
      s.stripes ?? '—',
      s.active ? 'Activo' : 'Inactivo',
      s.joinDate?.slice(0, 10) ?? '—',
      s.enrolledPlans?.map((p) => p.name).join(', ') || '—',
    ]),
  });

  // ── Página 2: historial de graduaciones ──────────────────────────────────
  const studentIds = new Set(students.map((s) => s.id));
  const filteredPromos = promotions.filter((p) => !p.deleted && studentIds.has(p.studentId));

  if (filteredPromos.length > 0) {
    doc.addPage('landscape');
    doc.setFontSize(14);
    doc.setTextColor(30);
    doc.text('Historial de Graduaciones', 14, 16);
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(`${filteredPromos.length} registro${filteredPromos.length !== 1 ? 's' : ''}`, 14, 22);

    autoTable(doc, {
      startY: 27,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      head: [['Alumno', 'Tipo', 'Desde', 'Grados antes', 'Hasta', 'Grados despues', 'Fecha', 'Notas']],
      body: filteredPromos.map((p) => [
        p.studentName,
        TYPE_LABEL[p.type] ?? p.type,
        p.fromBelt ?? '—',
        p.fromStripes ?? '—',
        p.toBelt,
        p.toStripes,
        p.promotionDate?.slice(0, 10) ?? '—',
        p.notes ?? '—',
      ]),
    });
  }

  doc.save(`${filename}.pdf`);
}

// ── Payments ─────────────────────────────────────────────────────────────────

function paymentsToRows(payments: Payment[]) {
  return payments.map((p) => {
    const remaining = p.remaining ?? 0;
    const discountLabel = p.discount && Number(p.discount) > 0
      ? p.discountType === 'PERCENT' ? `${p.discount}%` : formatClp(Number(p.discount))
      : '—';
    return {
      Alumno: p.studentName,
      Esperado: p.expectedAmount != null ? formatClp(p.expectedAmount) : '—',
      Descuento: discountLabel,
      Pagado: formatClp(Number(p.amount)),
      Pendiente: remaining > 0 ? formatClp(remaining) : '—',
      Estado: remaining > 0 ? 'Pendiente' : 'Completo',
      Mes: MONTH_NAMES[(p.month ?? 1) - 1],
      Año: p.year,
      'Fecha pago': p.paidAt?.slice(0, 10) ?? '—',
      Notas: p.notes ?? '',
    };
  });
}

export function exportPaymentsExcel(payments: Payment[], month: number, year: number) {
  const ws = XLSX.utils.json_to_sheet(paymentsToRows(payments));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Pagos');
  XLSX.writeFile(wb, `pagos_${MONTH_NAMES[month - 1].toLowerCase()}_${year}.xlsx`);
}

export function exportPaymentsPDF(payments: Payment[], month: number, year: number) {
  const doc = new jsPDF({ orientation: 'landscape' });
  const title = `Pagos — ${MONTH_NAMES[month - 1]} ${year}`;
  doc.setFontSize(14);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(120);
  const paid = payments.filter((p) => (p.remaining ?? 0) === 0).length;
  const pending = payments.length - paid;
  doc.text(`Total: ${payments.length} | Completos: ${paid} | Pendientes: ${pending}`, 14, 22);

  autoTable(doc, {
    startY: 27,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    head: [['Alumno', 'Esperado', 'Descuento', 'Pagado', 'Pendiente', 'Estado', 'Fecha pago', 'Notas']],
    body: payments.map((p) => {
      const remaining = p.remaining ?? 0;
      const discountLabel = p.discount && Number(p.discount) > 0
        ? p.discountType === 'PERCENT' ? `${p.discount}%` : formatClp(Number(p.discount))
        : '—';
      return [
        p.studentName,
        p.expectedAmount != null ? formatClp(p.expectedAmount) : '—',
        discountLabel,
        formatClp(Number(p.amount)),
        remaining > 0 ? formatClp(remaining) : '—',
        remaining > 0 ? 'Pendiente' : 'Completo',
        p.paidAt?.slice(0, 10) ?? '—',
        p.notes ?? '—',
      ];
    }),
  });

  doc.save(`pagos_${MONTH_NAMES[month - 1].toLowerCase()}_${year}.pdf`);
}
