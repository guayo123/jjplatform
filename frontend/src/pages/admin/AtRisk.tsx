import AtRiskPanel from '../../components/AtRiskPanel';

export default function AtRisk() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Alumnos en riesgo</h1>
        <p className="text-gray-500">Sin pago este mes o sin entrenar hace tiempo. Envía un recordatorio por WhatsApp.</p>
      </div>
      <div className="max-w-2xl">
        <AtRiskPanel />
      </div>
    </div>
  );
}
