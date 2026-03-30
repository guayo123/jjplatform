import { useEffect, useState, useMemo } from 'react';
import { paymentsApi } from '../../api/payments';
import { useStudentStore } from '../../stores/studentStore';
import type { Payment } from '../../types';

const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function PaymentsReport() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const { students, fetchStudents } = useStudentStore();
  const activeStudents = useMemo(() => students.filter((s) => s.active), [students]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setLoading(true);
    paymentsApi.getByYear(year)
      .then(setPayments)
      .finally(() => setLoading(false));
  }, [year]);

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
