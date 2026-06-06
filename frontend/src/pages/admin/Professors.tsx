import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { professorsApi } from '../../api/professors';
import { useToast } from '../../components/ToastContext';
import { useConfirm } from '../../components/ConfirmContext';
import { useGuidedTour } from '../../utils/useGuidedTour';
import type { Professor } from '../../types';


export default function Professors() {
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const confirm = useConfirm();

  const load = () =>
    professorsApi.list().then(setProfessors).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (p: Professor) => {
    try {
      const updated = await professorsApi.update(p.id, {
        name: p.name,
        photoUrl: p.photoUrl,
        bio: p.bio,
        achievements: p.achievements,
        displayOrder: p.displayOrder ?? 0,
        studentId: p.studentId,
        disciplineId: p.disciplineId,
        email: p.email,
        active: !p.active,
      });
      setProfessors((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch {
      toast.error('Error al cambiar estado');
    }
  };

  const handleGrantAccess = async (p: Professor) => {
    if (!p.effectiveEmail) {
      toast.error('Agrega un email al profesor antes de crear su cuenta.');
      return;
    }
    const ok = await confirm({
      message: `Se creará una cuenta para "${p.name}" y se enviará una clave temporal a ${p.effectiveEmail}. ¿Continuar?`,
      confirmLabel: 'Crear cuenta',
    });
    if (!ok) return;
    try {
      const updated = await professorsApi.grantAccess(p.id);
      setProfessors((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
      toast.success(`Cuenta creada. Clave temporal enviada a ${p.effectiveEmail}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear la cuenta';
      toast.error(msg);
    }
  };

  const handleResendCredentials = async (p: Professor) => {
    const ok = await confirm({
      message: `Se generará una nueva clave temporal y se enviará a ${p.effectiveEmail}. La clave anterior dejará de funcionar.`,
      confirmLabel: 'Reenviar clave',
      danger: true,
    });
    if (!ok) return;
    try {
      await professorsApi.resendCredentials(p.id);
      toast.success(`Nueva clave temporal enviada a ${p.effectiveEmail}.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al reenviar la clave';
      toast.error(msg);
    }
  };

  const handleDelete = async (p: Professor) => {
    const ok = await confirm({
      message: `¿Eliminar al profesor "${p.name}"? Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;
    try {
      await professorsApi.delete(p.id);
      setProfessors((prev) => prev.filter((x) => x.id !== p.id));
      toast.success('Profesor eliminado');
    } catch {
      toast.error('Error al eliminar');
    }
  };

  const startTour = useGuidedTour({
    storageKey: 'jjp_professors_tour',
    welcomeTitle: '👋 Profesores',
    welcomeBody: '<p>Aquí gestionas a los profesores que se muestran en el perfil público. Te muestro las opciones.</p>',
    loading,
    buildSteps: () => [
      {
        element: '[data-tour="nuevo-profesor"]',
        popover: { title: '➕ Nuevo profesor', description: 'Agrega un profesor con su foto, disciplina y biografía.', side: 'bottom', align: 'end' },
      },
      ...(professors.length > 0
        ? [
            {
              element: '[data-tour="prof-editar"]',
              popover: { title: '✏️ Editar', description: 'Edita los datos del profesor.', side: 'top' as const, align: 'start' as const },
            },
            {
              element: '[data-tour="prof-acceso"]',
              popover: { title: '🔑 Acceso al sistema', description: 'Crea una cuenta para el profesor (clave temporal por correo) o reenvíale una nueva.', side: 'top' as const, align: 'start' as const },
            },
          ]
        : []),
    ],
  });

  if (loading)
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profesores</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Los profesores activos se muestran en el perfil público de la academia.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={startTour}
            title="Ayuda"
            aria-label="Ayuda"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 text-sm font-bold transition-colors"
          >
            ?
          </button>
          <button
            data-tour="nuevo-profesor"
            onClick={() => navigate('/admin/professors/new')}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Nuevo profesor
          </button>
        </div>
      </div>

      {professors.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <p className="text-gray-400 text-4xl mb-3">🥋</p>
          <p className="text-gray-500 font-medium">No hay profesores registrados</p>
          <p className="text-gray-400 text-sm mt-1">Agrega el primer profesor de tu academia</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {professors.map((p, i) => (
            <div
              key={p.id}
              className={`bg-white rounded-xl shadow-sm border p-5 flex flex-col gap-3 transition-opacity ${
                p.active ? 'border-gray-100' : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                {p.photoUrl ? (
                  <img
                    src={p.photoUrl}
                    alt={p.name}
                    className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl font-bold text-gray-400">
                      {p.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-gray-800 truncate">{p.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {p.disciplineName && (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-primary-100 text-primary-700">
                        {p.disciplineName}
                      </span>
                    )}
                    {p.belt && (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        {p.belt}
                      </span>
                    )}
                    {p.studentId && (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-blue-100 text-blue-700 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        También alumno
                      </span>
                    )}
                    {p.hasAccount && (
                      <span className="text-xs px-2 py-0.5 rounded font-medium bg-emerald-100 text-emerald-700" title={`Acceso: ${p.effectiveEmail}`}>
                        Acceso al sistema
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {p.bio && (
                <p className="text-sm text-gray-500 line-clamp-2">{p.bio}</p>
              )}

              {p.achievements && (
                <ul className="space-y-0.5">
                  {p.achievements.split('\n').filter(Boolean).slice(0, 3).map((a, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                      <span className="text-primary-500 mt-0.5">🏆</span>
                      {a}
                    </li>
                  ))}
                  {p.achievements.split('\n').filter(Boolean).length > 3 && (
                    <li className="text-xs text-gray-400 pl-5">
                      +{p.achievements.split('\n').filter(Boolean).length - 3} más...
                    </li>
                  )}
                </ul>
              )}

              <div className="flex flex-wrap gap-x-2 gap-y-1 mt-auto pt-2 border-t border-gray-100">
                <button
                  data-tour={i === 0 ? 'prof-editar' : undefined}
                  onClick={() => navigate(`/admin/professors/${p.id}/edit`)}
                  className="flex-1 text-center text-sm text-primary-600 hover:text-primary-700 font-medium py-1.5 rounded-lg hover:bg-primary-50 transition-colors"
                >
                  Editar
                </button>
                {p.studentId && (
                  <button
                    onClick={() => navigate(`/admin/students/${p.studentId}`)}
                    className="flex-1 text-center text-sm text-amber-600 hover:text-amber-700 font-medium py-1.5 rounded-lg hover:bg-amber-50 transition-colors"
                    title="Ver historial de cinturones y promociones"
                  >
                    Historial
                  </button>
                )}
                {!p.hasAccount ? (
                  <button
                    data-tour={i === 0 ? 'prof-acceso' : undefined}
                    onClick={() => handleGrantAccess(p)}
                    disabled={!p.effectiveEmail}
                    title={p.effectiveEmail ? `Enviar clave temporal a ${p.effectiveEmail}` : 'Agrega un email al profesor primero'}
                    className="flex-1 text-center text-sm text-emerald-600 hover:text-emerald-700 disabled:text-gray-300 disabled:cursor-not-allowed font-medium py-1.5 rounded-lg hover:bg-emerald-50 disabled:hover:bg-transparent transition-colors"
                  >
                    Dar acceso
                  </button>
                ) : (
                  <button
                    data-tour={i === 0 ? 'prof-acceso' : undefined}
                    onClick={() => handleResendCredentials(p)}
                    title={`Reenviar nueva clave a ${p.effectiveEmail}`}
                    className="flex-1 text-center text-sm text-emerald-600 hover:text-emerald-700 font-medium py-1.5 rounded-lg hover:bg-emerald-50 transition-colors"
                  >
                    Reenviar clave
                  </button>
                )}
                <button
                  onClick={() => handleToggleActive(p)}
                  className={`flex-1 text-center text-sm font-medium py-1.5 rounded-lg transition-colors ${
                    p.active
                      ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                      : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                  }`}
                >
                  {p.active ? 'Desactivar' : 'Activar'}
                </button>
                <button
                  onClick={() => handleDelete(p)}
                  className="text-sm text-red-400 hover:text-red-600 font-medium py-1.5 px-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
