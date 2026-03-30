import { useEffect, useState } from 'react';
import { paymentsApi } from '../../api/payments';
import { useStudentStore } from '../../stores/studentStore';
import { useAuthStore } from '../../stores/authStore';
import type { Payment, PaymentForm } from '../../types';

export default function Payments() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { students, fetchStudents } = useStudentStore();
  const { role } = useAuthStore();
  const canEdit = role === 'ADMIN' || role === 'ENCARGADO';

  const [form, setForm] = useState<PaymentForm>({
    studentId: 0,
    amount: 0,
    month,
    year,
    notes: '',
  });

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    loadPayments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year]);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentsApi.getByMonth(month, year);
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await paymentsApi.create({ ...form, month, year });
    setShowForm(false);
    loadPayments();
  };

  const paidStudentIds = new Set(payments.map((p) => p.studentId));
  const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const formatCLP = (amount: number) =>
    new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pagos</h1>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Registrar pago
          </button>
        )}
      </div>

      {/* Month/Year selector */}
      <div className="flex gap-3 mb-6">
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {monthNames.map((name, i) => (
            <option key={i} value={i + 1}>{name}</option>
          ))}
        </select>
        <input
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24"
        />
      </div>

      {/* Payment form */}
      {canEdit && showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
              <select
                value={form.studentId}
                onChange={(e) => setForm({ ...form, studentId: Number(e.target.value) })}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value={0}>Seleccionar...</option>
                {students
                  .filter((s) => !paidStudentIds.has(s.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto</label>
              <input
                type="number"
                value={form.amount || ''}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                required
                min={0}
                step={0.01}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
          <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
            Guardar pago
          </button>
        </form>
      )}

      {/* Payment status overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold mb-4">
          Estado de pagos — {monthNames[month - 1]} {year}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((student) => {
            const paid = paidStudentIds.has(student.id);
            return (
              <div
                key={student.id}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  paid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${paid ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm font-medium">{student.name}</span>
                <span className={`ml-auto text-xs font-medium ${paid ? 'text-green-600' : 'text-red-600'}`}>
                  {paid
                    ? formatCLP(payments.find((p) => p.studentId === student.id)?.amount ?? 0)
                    : 'Pendiente'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payments list */}
      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alumno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-6 py-4 text-sm font-medium">{p.studentName}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-800">{formatCLP(Number(p.amount))}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.paidAt?.slice(0, 10)}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{p.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
