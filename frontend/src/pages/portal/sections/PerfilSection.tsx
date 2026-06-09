import BeltImage from '../../../components/BeltImage';
import ImageUpload from '../../../components/ImageUpload';
import type { Student } from '../../../types';
import { formatDate, Field } from './shared';

interface Props {
  student: Student;
  uploading: boolean;
  uploadProgress: number;
  onPhotoUpload: (file: File) => Promise<void>;
}

/** "Perfil" — student card, personal data and enrolled plans/professors. */
export default function PerfilSection({ student, uploading, uploadProgress, onPhotoUpload }: Props) {
  return (
    <>
      {/* Student card with editable photo */}
      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-start gap-5">
          <div className="flex-shrink-0 w-40" data-tour="photo">
            <ImageUpload
              value={student.photoUrl}
              onFile={onPhotoUpload}
              uploading={uploading}
              progress={uploadProgress}
              profile="profile"
              label="tu foto"
              aspect="portrait"
            />
            <p className="text-[10px] text-gray-400 text-center mt-1">Toca la foto para cambiarla</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${student.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {student.active ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            {student.nickname && <p className="text-sm text-gray-500 mt-0.5">"{student.nickname}"</p>}
            {student.academyName && <p className="text-sm text-primary-600 mt-1">{student.academyName}</p>}
            {student.joinDate && (
              <p className="text-xs text-gray-400 mt-2">📅 Ingresó el {formatDate(student.joinDate)}</p>
            )}
            {(student.disciplineBelts ?? []).length > 0 && (
              <div className="mt-4 space-y-2" data-tour="cinturon">
                {student.disciplineBelts!.map((d) => (
                  <div key={d.disciplineId} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20 flex-shrink-0 truncate">{d.disciplineName}</span>
                    <BeltImage belt={d.belt} stripes={d.stripes} colorHex={d.beltColorHex ?? undefined} className="max-w-[180px]" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Personal data */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-bold text-gray-900 mb-4">Mis datos</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Field label="RUT" value={student.rut} />
          <Field label="Email" value={student.email} />
          <Field label="Teléfono" value={student.phone} />
          <Field label="Teléfono de emergencia" value={student.emergencyPhone} />
          <Field label="Edad" value={student.age != null ? `${student.age} años` : null} />
          <Field label="Peso" value={student.weight != null ? `${student.weight} kg` : null} />
          <Field label="Dirección" value={student.address} />
          <Field label="Grupo sanguíneo" value={student.bloodType} />
          <Field label="Previsión" value={student.healthInsuranceType} />
          <Field label="Institución de salud" value={student.healthInsuranceCompany} />
        </dl>
        {student.medicalNotes && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Notas médicas</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.medicalNotes}</p>
          </div>
        )}
      </div>

      {/* Plans & professors */}
      {student.enrolledPlans && student.enrolledPlans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-bold text-gray-900 mb-4">Planes y profesores</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {student.enrolledPlans.map((plan) => (
              <div key={plan.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  {plan.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">{plan.name}</p>
                  {plan.disciplineName && <p className="text-xs text-gray-500 mt-0.5">{plan.disciplineName}</p>}
                  {plan.professorName && <p className="text-xs text-gray-600 font-medium mt-1.5">Prof. {plan.professorName}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
