import { useEffect, useState } from 'react';
import { paymentsApi } from '../../api/payments';
import { academiesApi } from '../../api/academies';
import { useStudentStore } from '../../stores/studentStore';
import { useAuthStore } from '../../stores/authStore';
import { formatCLP } from '../../utils/format';
import type { Payment, PaymentForm, Plan } from '../../types';

const MONTH_NAMES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function computeNetExpected(p: Payment): number | null {
  if (p.expectedAmount == null) return null;
  const disc = p.discount ?? 0;
  if (p.discountType === 'PERCENT') return p.expectedAmount * (1 - disc / 100);
  return p.expectedAmount - disc;
}

function parseCLPInput(s: string): number {
  const n = Number(s.replace(/\./g, '').trim());
  return isNaN(n) ? 0 : n;
}

function toCLPDisplay(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export default function Payments() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [abonoTarget, setAbonoTarget] = useState<Payment | null>(null);
  const [abonoInput, setAbonoInput] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);
  const [view, setView] = useState<'month' | 'plan'>('month');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  // CLP display state for inputs
  const [amountInput, setAmountInput] = useState('0');
  const [discountInput, setDiscountInput] = useState('');

  const { students, fetchStudents } = useStudentStore();
  const { role } = useAuthStore();
  const canEdit = role === 'ADMIN' || role === 'ENCARGADO' || role === 'PROFESOR';

  const [form, setForm] = useState<PaymentForm>({
    studentId: 0,
    amount: 0,
    discount: 0,
    discountType: 'AMOUNT',
    month,
    year,
    notes: '',
  });

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { loadPayments(); }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    academiesApi.getPlans().then((p) => setPlans(p.filter((x) => x.active)));
  }, []);

  const loadPayments = async () => {
    setLoading(true);
    try {
      const data = await paymentsApi.getByMonth(month, year);
      setPayments(data);
    } finally {
      setLoading(false);
    }
  };

  // ── derived from form state ──────────────────────────────────────────────
  const selectedStudent = students.find(s => s.id === form.studentId);
  const planTotal = selectedStudent?.enrolledPlans?.reduce((sum, p) => sum + (p.price ?? 0), 0) ?? 0;

  function calcNetExpected(discount: number, discountType: 'AMOUNT' | 'PERCENT'): number {
    if (discountType === 'PERCENT') return Math.round(planTotal * (1 - discount / 100));
    return Math.max(0, planTotal - discount);
  }

  const netExpected = calcNetExpected(form.discount ?? 0, form.discountType ?? 'AMOUNT');
  const isFullPayment = planTotal > 0 && form.amount >= netExpected;
  const pendingAmount = Math.max(0, netExpected - form.amount);

  // ── handlers ─────────────────────────────────────────────────────────────
  const handleStudentChange = (studentId: number) => {
    const student = students.find(s => s.id === studentId);
    const total = student?.enrolledPlans?.reduce((sum, p) => sum + (p.price ?? 0), 0) ?? 0;
    setForm(f => ({ ...f, studentId, amount: total, discount: 0, discountType: 'AMOUNT' }));
    setAmountInput(toCLPDisplay(total));
    setDiscountInput('');
  };

  const handleDiscountBlur = () => {
    const disc = parseCLPInput(discountInput || '0');
    const newNet = calcNetExpected(disc, form.discountType ?? 'AMOUNT');
    setForm(f => ({ ...f, discount: disc, amount: newNet }));
    if (form.discountType !== 'PERCENT' && disc > 0) setDiscountInput(toCLPDisplay(disc));
    setAmountInput(toCLPDisplay(newNet));
  };

  const handleAmountBlur = () => {
    const val = parseCLPInput(amountInput);
    const capped = netExpected > 0 ? Math.min(val, netExpected) : val;
    setForm(f => ({ ...f, amount: capped }));
    setAmountInput(toCLPDisplay(capped));
  };

  const handleAbonoBlur = () => {
    const val = parseCLPInput(abonoInput);
    const maxAbono = abonoTarget?.remaining ?? Infinity;
    const capped = maxAbono < Infinity ? Math.min(val, maxAbono) : val;
    setAbonoInput(toCLPDisplay(capped));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await paymentsApi.create({ ...form, month, year });
    setShowForm(false);
    setForm(f => ({ ...f, studentId: 0, amount: 0, discount: 0, notes: '' }));
    setAmountInput('0');
    setDiscountInput('');
    loadPayments();
  };

  const handleAbono = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!abonoTarget || !abonoInput) return;
    setSavingAbono(true);
    try {
      await paymentsApi.abono(abonoTarget.id, parseCLPInput(abonoInput));
      setAbonoTarget(null);
      setAbonoInput('');
      loadPayments();
    } finally {
      setSavingAbono(false);
    }
  };

  const paidStudentIds = new Set(payments.map(p => p.studentId));
  const unpaidStudents = students.filter(s => !paidStudentIds.has(s.id));

  // Vista por plan
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const planStudents = selectedPlanId
    ? students.filter((s) => s.enrolledPlans?.some((ep) => ep.id === selectedPlanId))
    : [];
  const plansByDiscipline = plans.reduce<Record<string, Plan[]>>((acc, p) => {
    const key = p.disciplineName ?? 'Sin disciplina';
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Pagos</h1>
        {canEdit && view === 'month' && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Registrar pago
          </button>
        )}
      </div>

      {/* View toggle + Month/Year selector */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setView('month')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'month' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Por mes
          </button>
          <button
            onClick={() => setView('plan')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'plan' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Por plan
          </button>
        </div>

        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          {MONTH_NAMES.map((name, i) => (
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

      {/* ── Vista por plan ─────────────────────────────────────────────────── */}
      {view === 'plan' && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Seleccionar plan</label>
            <select
              value={selectedPlanId ?? ''}
              onChange={(e) => setSelectedPlanId(e.target.value ? Number(e.target.value) : null)}
              className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            >
              <option value="">Seleccionar plan…</option>
              {Object.entries(plansByDiscipline).map(([discipline, dPlans]) => (
                <optgroup key={discipline} label={discipline}>
                  {dPlans.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedPlan && (
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-800">{selectedPlan.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {MONTH_NAMES[month - 1]} {year} — {planStudents.length} alumno{planStudents.length !== 1 ? 's' : ''} matriculado{planStudents.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-green-600">
                    <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                    Pagado: {planStudents.filter(s => { const p = payments.find(x => x.studentId === s.id); return p && (p.remaining ?? 0) === 0; }).length}
                  </span>
                  <span className="flex items-center gap-1.5 text-orange-500">
                    <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                    Abono: {planStudents.filter(s => { const p = payments.find(x => x.studentId === s.id); return p && (p.remaining ?? 0) > 0; }).length}
                  </span>
                  <span className="flex items-center gap-1.5 text-red-500">
                    <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                    Pendiente: {planStudents.filter(s => !payments.find(x => x.studentId === s.id)).length}
                  </span>
                </div>
              </div>

              {planStudents.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Ningún alumno matriculado en este plan.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {planStudents.map((student) => {
                    const payment = payments.find((p) => p.studentId === student.id);
                    const remaining = payment?.remaining ?? null;
                    const isPartial = remaining != null && remaining > 0;
                    const isPaid = !!payment && !isPartial;

                    let statusColor = 'border-red-200 bg-red-50';
                    let dotColor = 'bg-red-500';
                    if (isPaid) { statusColor = 'border-green-200 bg-green-50'; dotColor = 'bg-green-500'; }
                    else if (isPartial) { statusColor = 'border-orange-200 bg-orange-50'; dotColor = 'bg-orange-400'; }

                    return (
                      <div key={student.id} className={`flex items-center gap-3 p-3 rounded-lg border ${statusColor}`}>
                        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />
                        <span className="text-sm font-medium truncate">{student.name}</span>
                        <div className="ml-auto text-right flex-shrink-0">
                          {payment ? (
                            <>
                              <div className={`text-xs font-semibold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                                {formatCLP(Number(payment.amount))}
                                {payment.expectedAmount != null && ` / ${formatCLP(payment.expectedAmount)}`}
                              </div>
                              {isPartial && canEdit && (
                                <button
                                  onClick={() => setAbonoTarget(payment)}
                                  className="text-xs text-primary-600 hover:underline mt-0.5"
                                >
                                  + Abonar
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-xs font-medium text-red-600">Pendiente</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === 'month' && (<>

      {/* Payment form */}
      {canEdit && showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm p-6 mb-6 space-y-5">
          <h2 className="font-semibold text-gray-800">Nuevo pago — {MONTH_NAMES[month - 1]} {year}</h2>

          {/* Student selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Alumno</label>
            <select
              value={form.studentId}
              onChange={(e) => handleStudentChange(Number(e.target.value))}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value={0}>Seleccionar...</option>
              {unpaidStudents.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Plan breakdown */}
          {selectedStudent && (selectedStudent.enrolledPlans?.length ?? 0) > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Planes inscritos</p>
              <div className="space-y-2">
                {selectedStudent.enrolledPlans!.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="text-gray-700">{p.name}</span>
                    <span className="font-medium text-gray-800">{p.price != null ? formatCLP(p.price) : '—'}</span>
                  </div>
                ))}
                <div className="border-t border-gray-200 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Total planes</span>
                  <span className="text-gray-900">{formatCLP(planTotal)}</span>
                </div>
                {(form.discount ?? 0) > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-orange-500">
                      <span>
                        Descuento{form.discountType === 'PERCENT' ? ` (${form.discount}%)` : ''}
                      </span>
                      <span className="font-medium">
                        -{form.discountType === 'PERCENT'
                          ? formatCLP(planTotal - netExpected)
                          : formatCLP(form.discount ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-orange-600 border-t border-orange-100 pt-2">
                      <span>Neto a pagar</span>
                      <span>{formatCLP(netExpected)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Discount + Net expected */}
          {selectedStudent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descuento</label>
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
                    {form.discountType === 'PERCENT' ? '' : '$'}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value.replace(/[^0-9.]/g, ''))}
                    onBlur={handleDiscountBlur}
                    placeholder="0"
                    className={`w-full border border-gray-300 rounded-lg py-2 pr-3 text-sm ${form.discountType === 'PERCENT' ? 'pl-3' : 'pl-6'}`}
                  />
                </div>
                <select
                  value={form.discountType}
                  onChange={(e) => {
                    setForm(f => ({ ...f, discountType: e.target.value as 'AMOUNT' | 'PERCENT', discount: 0 }));
                    setDiscountInput('');
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="AMOUNT">$ pesos</option>
                  <option value="PERCENT">% porcentaje</option>
                </select>
              </div>
              {(form.discount ?? 0) > 0 && (
                <p className="text-sm text-primary-600 mt-1.5 font-medium">
                  Neto a pagar: {formatCLP(netExpected)}
                </p>
              )}
            </div>
          )}

          {/* Amount paid */}
          {selectedStudent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto pagado</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  onBlur={handleAmountBlur}
                  required
                  className="w-full border border-gray-300 rounded-lg pl-6 pr-3 py-2 text-sm"
                />
              </div>
              {/* Status indicator */}
              {planTotal > 0 && (
                <div className={`mt-2 flex items-center gap-2 text-sm font-medium ${isFullPayment ? 'text-green-600' : 'text-orange-500'}`}>
                  {isFullPayment ? (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Pago completo
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
                      </svg>
                      Abono — queda pendiente {formatCLP(pendingAmount)}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Guardar pago
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Abono modal */}
      {abonoTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAbono} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <h2 className="font-semibold text-gray-800">Registrar abono</h2>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Alumno</span>
                <span className="font-medium">{abonoTarget.studentName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Período</span>
                <span>{MONTH_NAMES[abonoTarget.month - 1]} {abonoTarget.year}</span>
              </div>
              {abonoTarget.expectedAmount != null && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Total esperado</span>
                  <span>{formatCLP(computeNetExpected(abonoTarget) ?? abonoTarget.expectedAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Ya pagado</span>
                <span className="text-green-600 font-medium">{formatCLP(Number(abonoTarget.amount))}</span>
              </div>
              {abonoTarget.remaining != null && abonoTarget.remaining > 0 && (
                <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                  <span className="font-semibold text-orange-600">Pendiente</span>
                  <span className="font-semibold text-orange-600">{formatCLP(abonoTarget.remaining)}</span>
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto del abono</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={abonoInput}
                  onChange={(e) => setAbonoInput(e.target.value.replace(/[^0-9.]/g, ''))}
                  onBlur={handleAbonoBlur}
                  required
                  autoFocus
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-lg pl-6 pr-3 py-2 text-sm"
                />
              </div>
              {abonoTarget.remaining != null && abonoTarget.remaining > 0 && (
                <p className="text-xs text-gray-500 mt-1">Máximo: {formatCLP(abonoTarget.remaining)}</p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={savingAbono}
                className="flex-1 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {savingAbono ? 'Guardando...' : 'Registrar abono'}
              </button>
              <button
                type="button"
                onClick={() => { setAbonoTarget(null); setAbonoInput(''); }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Payment status overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold mb-4">Estado — {MONTH_NAMES[month - 1]} {year}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((student) => {
            const payment = payments.find(p => p.studentId === student.id);
            const netExpected = payment ? computeNetExpected(payment) : null;
            const gross = payment?.expectedAmount ?? null;
            const remaining = payment?.remaining ?? null;
            const isPartial = remaining != null && remaining > 0;
            const isPaid = !!payment && !isPartial;
            const isExento = isPaid && netExpected === 0 && gross != null && gross > 0;

            let statusColor = 'border-red-200 bg-red-50';
            let dotColor = 'bg-red-500';
            if (isPaid) { statusColor = 'border-green-200 bg-green-50'; dotColor = 'bg-green-500'; }
            else if (isPartial) { statusColor = 'border-orange-200 bg-orange-50'; dotColor = 'bg-orange-400'; }

            return (
              <div key={student.id} className={`flex items-center gap-3 p-3 rounded-lg border ${statusColor}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dotColor}`} />
                <span className="text-sm font-medium truncate">{student.name}</span>
                <div className="ml-auto text-right flex-shrink-0">
                  {payment ? (
                    <>
                      <div className={`text-xs font-semibold ${isPaid ? 'text-green-600' : 'text-orange-600'}`}>
                        {isExento ? 'Exento' : (
                          <>
                            {formatCLP(Number(payment.amount))}
                            {gross != null && ` / ${formatCLP(gross)}`}
                          </>
                        )}
                      </div>
                      {isPartial && canEdit && (
                        <button
                          onClick={() => setAbonoTarget(payment)}
                          className="text-xs text-primary-600 hover:underline mt-0.5"
                        >
                          + Abonar
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs font-medium text-red-600">Pendiente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payments table */}
      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alumno</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Esperado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descuento</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pagado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notas</th>
                {canEdit && <th className="px-6 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((p) => {
                const remaining = p.remaining ?? 0;
                const discountLabel = p.discount && Number(p.discount) > 0
                  ? p.discountType === 'PERCENT'
                    ? `${p.discount}%`
                    : formatCLP(Number(p.discount))
                  : '—';
                return (
                  <tr key={p.id}>
                    <td className="px-6 py-4 text-sm font-medium">{p.studentName}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{p.expectedAmount != null ? formatCLP(p.expectedAmount) : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{discountLabel}</td>
                    <td className="px-6 py-4 text-sm font-semibold">{formatCLP(Number(p.amount))}</td>
                    <td className="px-6 py-4 text-sm">
                      {remaining > 0
                        ? <span className="text-orange-600 font-medium">Pendiente {formatCLP(remaining)}</span>
                        : <span className="text-green-600 font-medium">✓ Completo</span>}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.paidAt?.slice(0, 10)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{p.notes || '—'}</td>
                    {canEdit && (
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {remaining > 0 && (
                            <button
                              onClick={() => setAbonoTarget(p)}
                              className="text-xs text-primary-600 hover:underline font-medium whitespace-nowrap"
                            >
                              + Abonar
                            </button>
                          )}
                          {role === 'ADMIN' || role === 'ENCARGADO' || role === 'PROFESOR' ? (
                            <button
                              onClick={async () => {
                                if (!confirm(`¿Eliminar el pago de ${p.studentName}?`)) return;
                                await paymentsApi.delete(p.id);
                                loadPayments();
                              }}
                              className="text-xs text-red-500 hover:underline font-medium whitespace-nowrap"
                            >
                              Eliminar
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </>)}
    </div>
  );
}
