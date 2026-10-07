import DuelMaintenanceCard from '../../components/DuelMaintenanceCard';

export default function Maintenance() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Mantenimiento</h1>
        <p className="text-gray-500">Herramientas de limpieza del sistema</p>
      </div>
      <div className="max-w-2xl space-y-6">
        <DuelMaintenanceCard />
      </div>
    </div>
  );
}
