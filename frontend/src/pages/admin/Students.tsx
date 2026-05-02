import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../stores/studentStore';
import { useAuthStore } from '../../stores/authStore';
import Button from '../../components/Button';
import FormInput from '../../components/FormInput';
import FormSelect from '../../components/FormSelect';
import type { Student } from '../../types';

const BELT_COLORS: Record<string, string> = {
  Blanco:  'bg-gray-100 text-gray-700 border border-gray-300',
  Gris:    'bg-gray-300 text-gray-800',
  Amarillo:'bg-yellow-100 text-yellow-800',
  Naranja: 'bg-orange-100 text-orange-800',
  Verde:   'bg-green-100 text-green-800',
  Azul:    'bg-blue-100 text-blue-800',
  Morado:  'bg-purple-100 text-purple-800',
  Café:    'bg-amber-100 text-amber-900',
  Negro:   'bg-gray-900 text-white',
};

const ALL_BELTS = ['Blanco', 'Gris', 'Amarillo', 'Naranja', 'Verde', 'Azul', 'Morado', 'Café', 'Negro'];

type CompOp = '>=' | '<=' | '=';

interface Filters {
  name: string;
  belt: string;
  status: 'all' | 'active' | 'inactive';
  ageOp: CompOp;
  age: string;
  weightOp: CompOp;
  weight: string;
}

const DEFAULT_FILTERS: Filters = {
  name: '',
  belt: '',
  status: 'all',
  ageOp: '>=',
  age: '',
  weightOp: '>=',
  weight: '',
};

function applyOp(value: number | null, op: CompOp, target: number): boolean {
  if (value == null) return false;
  if (op === '>=') return value >= target;
  if (op === '<=') return value <= target;
  return value === target;
}

function BeltBadge({ belt }: { belt: string }) {
  const cls = BELT_COLORS[belt] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {belt}
    </span>
  );
}

function OpSelect({ value, onChange }: { value: CompOp; onChange: (v: CompOp) => void }) {
  return (
    <FormSelect value={value} onChange={(e) => onChange(e.target.value as CompOp)} className="w-16 px-2 py-1.5">
      <option value=">=">&ge;</option>
      <option value="<=">&le;</option>
      <option value="=">=</option>
    </FormSelect>
  );
}

export default function Students() {
  const { students, loading, fetchStudents, updateStudent } = useStudentStore();
  const { role } = useAuthStore();
  const navigate = useNavigate();
  const canEdit = role === 'ADMIN' || role === 'ENCARGADO' || role === 'PROFESOR';

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const set = <K extends keyof Filters>(key: K, val: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: val }));

  const hasFilters =
    filters.name !== '' ||
    filters.belt !== '' ||
    filters.status !== 'all' ||
    filters.age !== '' ||
    filters.weight !== '';

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (filters.name && !s.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
      if (filters.belt && s.belt !== filters.belt) return false;
      if (filters.status === 'active' && !s.active) return false;
      if (filters.status === 'inactive' && s.active) return false;
      if (filters.age !== '') {
        const target = parseFloat(filters.age);
        if (!isNaN(target) && !applyOp(s.age, filters.ageOp, target)) return false;
      }
      if (filters.weight !== '') {
        const target = parseFloat(filters.weight);
        if (!isNaN(target) && !applyOp(s.weight, filters.weightOp, target)) return false;
      }
      return true;
    });
  }, [students, filters]);

  const handleToggleActive = async (student: Student) => {
    await updateStudent(student.id, {
      name: student.name,
      nickname: student.nickname,
      rut: student.rut,
      email: student.email,
      phone: student.phone,
      emergencyPhone: student.emergencyPhone,
      joinDate: student.joinDate,
      age: student.age,
      weight: student.weight,
      belt: student.belt,
      photoUrl: student.photoUrl,
      address: student.address,
      medicalNotes: student.medicalNotes,
      bloodType: student.bloodType,
      healthInsuranceType: student.healthInsuranceType,
      healthInsuranceCompany: student.healthInsuranceCompany,
      active: !student.active,
      planIds: student.planIds,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Alumnos</h1>
        {canEdit && (
          <Button onClick={() => navigate('/admin/students/new')}>
            + Nuevo alumno
          </Button>
        )}
      </div>

      {/* Filter panel */}
      {students.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <FormInput
              type="text"
              placeholder="Buscar por nombre..."
              value={filters.name}
              onChange={(e) => set('name', e.target.value)}
            />

            <FormSelect
              value={filters.belt}
              onChange={(e) => set('belt', e.target.value)}
            >
              <option value="">Todos los cinturones</option>
              {ALL_BELTS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </FormSelect>

            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">Edad</span>
              <OpSelect value={filters.ageOp} onChange={(v) => set('ageOp', v)} />
              <FormInput
                type="number"
                placeholder="—"
                value={filters.age}
                onChange={(e) => set('age', e.target.value)}
                className="w-20 px-2 py-1.5"
                min={0}
              />
            </div>

            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500 whitespace-nowrap">Peso</span>
              <OpSelect value={filters.weightOp} onChange={(v) => set('weightOp', v)} />
              <FormInput
                type="number"
                placeholder="—"
                value={filters.weight}
                onChange={(e) => set('weight', e.target.value)}
                className="w-20 px-2 py-1.5"
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
              {(['all', 'active', 'inactive'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => set('status', s)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    filters.status === s
                      ? 'bg-gray-700 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Inactivos'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {filtered.length} de {students.length} alumno{students.length !== 1 ? 's' : ''}
              </span>
              {hasFilters && (
                <button
                  onClick={() => setFilters(DEFAULT_FILTERS)}
                  className="text-xs text-primary-600 hover:text-primary-800 font-medium transition-colors"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm flex flex-col items-center gap-3">
          <p className="text-gray-500">No hay alumnos registrados</p>
          <Button variant="ghost" onClick={() => navigate('/admin/students/new')}>
            Agregar primer alumno
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500">Ningún alumno coincide con los filtros</p>
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="mt-2 text-sm text-primary-600 hover:text-primary-800 font-medium"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <>
          {/* Tarjetas — móvil */}
          <div className="md:hidden space-y-3">
            {filtered.map((student) => (
              <div
                key={student.id}
                onClick={() => navigate(`/admin/students/${student.id}`)}
                className="bg-white rounded-xl shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 truncate">{student.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${student.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {student.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                      {student.age && <span>{student.age} años</span>}
                      {student.weight && <span>{student.weight} kg</span>}
                      {student.belt && <BeltBadge belt={student.belt} />}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                  {canEdit && (
                    <button
                      onClick={() => handleToggleActive(student)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${student.active ? 'bg-green-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${student.active ? 'translate-x-5' : 'translate-x-1'}`} />
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/admin/students/${student.id}`)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors"
                  >
                    Ver detalle
                  </button>
                  {canEdit && (
                    <button
                      onClick={() => navigate(`/admin/students/${student.id}/edit`)}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                    >
                      Editar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Tabla — desktop */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edad</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Peso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cinturón</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => navigate(`/admin/students/${student.id}`)}
                    className="hover:bg-primary-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {student.name.charAt(0)}
                        </div>
                        <span className="font-medium">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{student.age ?? '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {student.weight != null ? `${student.weight} kg` : '—'}
                    </td>
                    <td className="px-6 py-4">
                      {student.belt ? <BeltBadge belt={student.belt} /> : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      {canEdit ? (
                        <button
                          onClick={() => handleToggleActive(student)}
                          title={student.active ? 'Desactivar' : 'Activar'}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${student.active ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                          <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${student.active ? 'translate-x-5' : 'translate-x-1'}`} />
                        </button>
                      ) : (
                        <span className={`inline-block h-2 w-2 rounded-full ${student.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                      )}
                      <span className={`ml-2 text-xs font-medium ${student.active ? 'text-green-700' : 'text-gray-500'}`}>
                        {student.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/students/${student.id}`)}
                          className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary-50 text-primary-600 hover:bg-primary-100 hover:text-primary-800 transition-colors"
                        >
                          Ver detalle
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => navigate(`/admin/students/${student.id}/edit`)}
                            className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
