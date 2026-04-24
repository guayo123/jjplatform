import { useEffect, useState, useMemo } from 'react';
import { paymentsApi } from '../../api/payments';
import { useStudentStore } from '../../stores/studentStore';
import { useAuthStore } from '../../stores/authStore';
import type { Payment } from '../../types';

const MONTH_NAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function buildWhatsAppUrl(student: { name: string; phone: string | null }, month: string, academy: string | null): string {
  const phone = (student.phone ?? '').replace(/\D/g, '');
  const msg = `Hola ${student.name}, te recordamos que tu pago de ${month} en ${academy ?? 'la academia'} está pendiente. ¡Gracias!`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function PaymentsReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [notifyIndex, setNotifyIndex] = useState<number | null>(null);

  const { students, fetchStudents } = useStudentStore();
  const { academyName } = useAuthStore();
  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const currentMonthName = MONTH_NAMES[currentMonth - 1];

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setLoading(true);
    paymentsApi.getByYear(year)
      .then(setPayments)
      .finally(() => setLoading(false));
  }, [year]);

  // Active students without payment in current month (only relevant when viewing current year)
  const pendingStudents = useMemo(() => {
    if (year !== currentYear) return [];
    const currentMonthPayments = new Set(payments.filter(p => p.month === currentMonth).map(p => p.studentId));
    return activeStudents.filter(s => !currentMonthPayments.has(s.id));
  }, [activeStudents, payments, year, currentYear, currentMonth]);

  // Map: studentId -> month -> amount
  const paymentMap = useMemo(() => {
    const map = new Map<number, Map<number, number>>();
    for (const p of payments) {
      if (!map.has(p.studentId)) map.set(p.studentId, new Map());
      map.get(p.studentId)!.set(p.month, Number(p.amount));
    }
    return map;
  }, [payments]);

  // Include inactive students who have payments in the selected year
  const studentsToShow = useMemo(
    () => students.filter((s) => s.active || paymentMap.has(s.id)),
    [students, paymentMap]
  );

  // Monthly totals: month -> { total, count }
  const monthlyStats = useMemo(() => {
    return MONTHS.map((_, i) => {
      const month = i + 1;
      const monthPayments = payments.filter((p) => p.month === month);
      return {
        total: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
        count: monthPayments.length,
      };
    });
  }, [payments]);

  const yearTotal = useMemo(
    () => monthlyStats.reduce((sum, m) => sum + m.total, 0),
    [monthlyStats]
  );

  const maxMonthly = useMemo(
    () => Math.max(...monthlyStats.map((m) => m.total), 1),
    [monthlyStats]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reporte de pagos</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 font-medium">Año:</label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 text-center"
            min={2020}
            max={2099}
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : (
        <>
          {/* Year total */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-primary-600 text-white rounded-xl p-5 shadow-sm col-span-1">
              <p className="text-primary-200 text-sm font-medium">Total anual {year}</p>
              <p className="text-3xl font-bold mt-1">${yearTotal.toLocaleString('es-CL')}</p>
              <p className="text-primary-200 text-xs mt-1">{payments.length} pagos registrados</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-gray-500 text-sm font-medium">Alumnos activos</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{activeStudents.length}</p>
              <p className="text-gray-400 text-xs mt-1">en la academia</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <p className="text-gray-500 text-sm font-medium">Promedio mensual</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">
                ${(yearTotal / 12).toLocaleString('es-CL', { maximumFractionDigits: 0 })}
              </p>
              <p className="text-gray-400 text-xs mt-1">ingreso promedio por mes</p>
            </div>
          </div>

          {/* Pending payments section — only shown for current year */}
          {year === currentYear && (
            <div className={`rounded-xl border-2 p-5 ${pendingStudents.length === 0 ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}`}>
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pendingStudents.length === 0 ? '✅' : '⚠️'}</span>
                  <div>
                    <h2 className={`font-bold text-lg ${pendingStudents.length === 0 ? 'text-green-800' : 'text-orange-800'}`}>
                      {pendingStudents.length === 0
                        ? `Todos al día en ${currentMonthName}`
                        : `${pendingStudents.length} alumno${pendingStudents.length !== 1 ? 's' : ''} sin pago en ${currentMonthName}`}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {pendingStudents.length > 0 ? 'Envía un recordatorio por WhatsApp a cada alumno' : 'No hay pagos pendientes este mes'}
                    </p>
                  </div>
                </div>
                {pendingStudents.length > 0 && notifyIndex === null && (
                  <button
                    onClick={() => { setNotifyIndex(0); window.open(buildWhatsAppUrl(pendingStudents[0], currentMonthName, academyName), '_blank'); }}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    Notificar a todos
                  </button>
                )}
                {notifyIndex !== null && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 font-medium">{notifyIndex + 1} de {pendingStudents.length} enviados</span>
                    {notifyIndex < pendingStudents.length - 1 ? (
                      <button
                        onClick={() => { const next = notifyIndex + 1; setNotifyIndex(next); window.open(buildWhatsAppUrl(pendingStudents[next], currentMonthName, academyName), '_blank'); }}
                        className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
                      >
                        Siguiente →
                      </button>
                    ) : (
                      <button onClick={() => setNotifyIndex(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg transition-colors text-sm">
                        Finalizar
                      </button>
                    )}
                  </div>
                )}
              </div>

              {pendingStudents.length > 0 && (
                <div className="space-y-2">
                  {pendingStudents.map((student, idx) => (
                    <div
                      key={student.id}
                      className={`flex items-center justify-between gap-3 bg-white rounded-lg px-4 py-3 border transition-colors ${
                        notifyIndex === idx ? 'border-green-400 ring-2 ring-green-300' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {student.photoUrl ? (
                          <img src={student.photoUrl} alt={student.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {student.name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{student.name}</p>
                          {student.phone
                            ? <p className="text-xs text-gray-400">{student.phone}</p>
                            : <p className="text-xs text-red-400 italic">Sin teléfono registrado</p>
                          }
                        </div>
                      </div>
                      <a
                        href={buildWhatsAppUrl(student, currentMonthName, academyName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex-shrink-0 flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          student.phone
                            ? 'bg-green-500 hover:bg-green-600 text-white'
                            : 'bg-gray-200 text-gray-400 pointer-events-none'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Recordar
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Monthly bar chart */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-4">Ingresos por mes</h2>
            <div className="flex items-end gap-2 h-32">
              {monthlyStats.map((stat, i) => {
                const heightPct = maxMonthly > 0 ? (stat.total / maxMonthly) * 100 : 0;
                const isCurrentMonth = i + 1 === new Date().getMonth() + 1 && year === new Date().getFullYear();
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">
                      {stat.total > 0 ? `$${(stat.total / 1000).toFixed(0)}k` : ''}
                    </span>
                    <div className="w-full flex items-end" style={{ height: '80px' }}>
                      <div
                        className={`w-full rounded-t transition-all duration-500 ${
                          isCurrentMonth ? 'bg-primary-600' : 'bg-primary-300'
                        } ${stat.total === 0 ? 'opacity-20' : ''}`}
                        style={{ height: `${Math.max(heightPct, stat.total > 0 ? 4 : 2)}%` }}
                        title={`${MONTHS[i]}: $${stat.total.toLocaleString('es-CL')} (${stat.count} pagos)`}
                      />
                    </div>
                    <span className={`text-xs font-medium ${isCurrentMonth ? 'text-primary-700' : 'text-gray-400'}`}>
                      {MONTHS[i]}
                    </span>
                    <span className="text-xs text-gray-400">{stat.count > 0 ? stat.count : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Student x Month matrix */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Participación por alumno</h2>
              <p className="text-xs text-gray-400 mt-0.5">Monto pagado por mes — verde: pagado, gris: sin registro</p>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase sticky left-0 bg-gray-50 min-w-[160px]">
                      Alumno
                    </th>
                    {MONTHS.map((m) => (
                      <th key={m} className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase min-w-[56px]">
                        {m}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase min-w-[80px]">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {studentsToShow.map((student) => {
                    const studentPayments = paymentMap.get(student.id);
                    const studentTotal = studentPayments
                      ? Array.from(studentPayments.values()).reduce((s, a) => s + a, 0)
                      : 0;
                    const paidMonths = studentPayments ? studentPayments.size : 0;

                    return (
                      <tr key={student.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 sticky left-0 bg-white hover:bg-gray-50">
                          <div className="flex items-center gap-2">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.name} className={`w-7 h-7 rounded-full object-cover flex-shrink-0 ${!student.active ? 'opacity-50 grayscale' : ''}`} />
                            ) : (
                              <div className={`w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0 ${!student.active ? 'opacity-50' : ''}`}>
                                {student.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className={`font-medium truncate max-w-[110px] ${student.active ? 'text-gray-800' : 'text-gray-400'}`}>{student.name}</span>
                              {!student.active && (
                                <span className="text-xs text-gray-400 italic">inactivo</span>
                              )}
                            </div>
                          </div>
                        </td>
                        {MONTHS.map((_, i) => {
                          const amount = studentPayments?.get(i + 1);
                          return (
                            <td key={i} className="px-2 py-3 text-center">
                              {amount != null ? (
                                <span className="inline-flex items-center justify-center bg-green-100 text-green-700 text-xs font-semibold rounded-md px-1.5 py-0.5 min-w-[44px]">
                                  ${amount.toLocaleString('es-CL')}
                                </span>
                              ) : (
                                <span className="inline-block w-5 h-0.5 bg-gray-200 rounded mx-auto" />
                              )}
                            </td>
                          );
                        })}
                        <td className="px-4 py-3 text-right">
                          <div>
                            <span className="font-semibold text-gray-800">
                              ${studentTotal.toLocaleString('es-CL')}
                            </span>
                            <span className="text-xs text-gray-400 ml-1">({paidMonths}/12)</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {studentsToShow.length === 0 && (
                    <tr>
                      <td colSpan={14} className="px-4 py-8 text-center text-gray-400">
                        No hay alumnos con registros
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Footer totals */}
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="px-4 py-3 sticky left-0 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                      Total mes
                    </td>
                    {monthlyStats.map((stat, i) => (
                      <td key={i} className="px-2 py-3 text-center">
                        {stat.total > 0 ? (
                          <span className="text-xs font-semibold text-primary-700">
                            ${stat.total.toLocaleString('es-CL')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-right font-bold text-primary-700">
                      ${yearTotal.toLocaleString('es-CL')}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
