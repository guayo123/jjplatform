import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '../../api/portal';
import { useAuthStore } from '../../stores/authStore';
import BeltImage from '../../components/BeltImage';
import ImageUpload from '../../components/ImageUpload';
import { startPortalTour } from './portalTour';
import {
  SCENIC_BANNERS,
  IMAGE_BANNERS,
  BELT_BAR,
  bannerStyle,
  isImageBanner,
  bannerImageSrc,
  BannerArt,
  BannerThumb,
} from './portalBanners';
import type { Student, StudentDiscipline, BeltPromotion, Payment, PromotionType } from '../../types';

// localStorage value 'dismissed' = the student ticked "don't show again". Any other value (incl. absent)
// means the tour auto-runs on every entry.
const TOUR_KEY = 'jjp_portal_tour';

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const TYPE_CONFIG: Record<PromotionType, { icon: string; label: string; color: string }> = {
  PROMOCION:   { icon: '🏆', label: 'Promoción',   color: 'text-green-600' },
  DEGRADACION: { icon: '🔻', label: 'Degradación', color: 'text-red-500' },
  GRADO:       { icon: '⭐', label: 'Grado',        color: 'text-amber-500' },
};

function formatDate(iso: string | null) {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('es-CL', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

function money(n: number | null | undefined) {
  return n == null ? '—' : `$${n.toLocaleString('es-CL')}`;
}

function BeltBadge({ belt, colorHex }: { belt: string; colorHex?: string | null }) {
  if (colorHex) {
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return (
      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border"
        style={{ background: colorHex, color: lum < 0.45 ? '#FFF' : '#111827', borderColor: colorHex }}>
        {belt}
      </span>
    );
  }
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-gray-100 text-gray-700 border-gray-200">
      {belt}
    </span>
  );
}

export default function Portal() {
  const navigate = useNavigate();
  const { email, logout } = useAuthStore();
  const [profiles, setProfiles] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-profile detail
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [promotions, setPromotions] = useState<BeltPromotion[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedDisc, setExpandedDisc] = useState<number | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Portal cover/banner (per account)
  const [banner, setBanner] = useState<string | null>(null);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  // Guided tour. Auto-runs once the data is loaded unless the student ticked "don't show again".
  const tourStartedRef = useRef(false);

  useEffect(() => {
    Promise.all([portalApi.me(), portalApi.getBanner().catch(() => null)])
      .then(([list, b]) => {
        setProfiles(list);
        setSelectedId(list[0]?.id ?? null);
        setBanner((b as string | null) ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar tu información.'))
      .finally(() => setLoading(false));
  }, []);

  const chooseBanner = async (key: string | null) => {
    setBanner(key);
    setShowBannerPicker(false);
    try {
      await portalApi.setBanner(key);
    } catch {
      // Non-critical: the choice stays applied for this session even if persisting fails.
    }
  };

  useEffect(() => {
    if (selectedId == null) return;
    setDetailLoading(true);
    setExpandedDisc(null);
    Promise.all([
      portalApi.disciplines(selectedId),
      portalApi.beltPromotions(selectedId),
      portalApi.payments(selectedId),
    ])
      .then(([d, p, pay]) => { setDisciplines(d); setPromotions(p); setPayments(pay); })
      .catch(() => { setDisciplines([]); setPromotions([]); setPayments([]); })
      .finally(() => setDetailLoading(false));
  }, [selectedId]);

  const handleLogout = () => {
    logout();
    navigate('/portal/login', { replace: true });
  };

  const handlePhotoUpload = async (file: File) => {
    if (selectedId == null) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const { url } = await portalApi.uploadPhoto(selectedId, file, setUploadProgress);
      setProfiles((prev) => prev.map((p) => (p.id === selectedId ? { ...p, photoUrl: url } : p)));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const student = profiles.find((p) => p.id === selectedId) ?? null;

  const runTour = () => {
    if (!student) return;
    startPortalTour({
      firstName: student.name.split(' ')[0] || student.name,
      // Based on belts (available immediately from /me) so the tour can fire before the detail loads.
      hasDisciplines: (student.disciplineBelts?.length ?? 0) > 0,
      multiAcademy: profiles.length > 1,
      initialDismiss: localStorage.getItem(TOUR_KEY) === 'dismissed',
      onFinish: (dismissForever) => {
        if (dismissForever) localStorage.setItem(TOUR_KEY, 'dismissed');
        else localStorage.removeItem(TOUR_KEY);
      },
    });
  };

  // Auto-run the tour immediately once the profile is available, unless dismissed forever.
  useEffect(() => {
    if (loading || !student) return;
    if (tourStartedRef.current) return;
    if (localStorage.getItem(TOUR_KEY) === 'dismissed') return;
    tourStartedRef.current = true;
    runTour();
  }, [loading, student]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gray-100">
      <header
        className="relative overflow-hidden bg-gray-900 text-white"
        style={banner && !isImageBanner(banner) ? bannerStyle(banner) : undefined}
        data-tour="portada"
      >
        {/* Vector scenery for the CSS banners */}
        {banner && !isImageBanner(banner) && <BannerArt banner={banner} />}
        {/* Photographic covers: blurred fill (any aspect ratio) + the full poster shown whole */}
        {banner && isImageBanner(banner) && (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-60"
              style={{ backgroundImage: `url(${bannerImageSrc(banner)})` }}
            />
            <img
              src={bannerImageSrc(banner)}
              alt=""
              className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 h-full w-auto object-contain"
            />
          </>
        )}
        {/* Legibility scrim so the name/email read over any cover */}
        {banner && (
          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/70 to-transparent" />
        )}
        {banner === 'jiujitsu' && <div className="absolute inset-x-0 bottom-0 h-1.5" style={BELT_BAR} />}
        <div className="relative max-w-3xl mx-auto px-4 min-h-[200px] flex flex-col">
          <div className="flex items-center justify-end gap-2 pt-4">
            <button
              onClick={() => setShowBannerPicker((v) => !v)}
              title="Personalizar portada"
              aria-label="Personalizar portada"
              className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white bg-black/20 border border-white/30 hover:border-white/60 rounded-lg transition-colors"
            >
              🎨
            </button>
            <button
              onClick={runTour}
              title="Ayuda"
              aria-label="Ayuda"
              className="w-9 h-9 flex items-center justify-center text-white/90 hover:text-white bg-black/20 border border-white/30 hover:border-white/60 rounded-lg transition-colors font-bold"
            >
              ?
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-white/90 hover:text-white bg-black/20 border border-white/30 hover:border-white/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="mt-auto pb-5 pt-10 min-w-0">
            <p className="text-xs text-white/80 [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">Portal del alumno</p>
            <p className="font-semibold text-lg truncate [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">{email}</p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {loading ? (
          <Spinner />
        ) : error ? (
          <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl">{error}</div>
        ) : !student ? (
          <div className="text-center py-12 text-gray-400">No encontramos tu ficha de alumno.</div>
        ) : (
          <>
            {/* Cover/banner picker — toggled from the 🎨 button in the header */}
            {showBannerPicker && (
              <div className="bg-white rounded-xl shadow-sm p-3">
                <p className="text-xs text-gray-400 mb-2">Elige el diseño de tu portada</p>
                <div className="flex flex-wrap gap-2 items-center">
                  {[...SCENIC_BANNERS, ...IMAGE_BANNERS].map((opt) => (
                    <BannerThumb
                      key={opt.key}
                      option={opt}
                      selected={banner === opt.key}
                      onPick={() => chooseBanner(opt.key)}
                    />
                  ))}
                  <button
                    onClick={() => chooseBanner(null)}
                    className={`w-28 h-14 rounded-lg border-2 text-xs font-medium transition-colors ${banner === null ? 'border-primary-500 text-primary-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    Sin portada
                  </button>
                </div>
              </div>
            )}

            {profiles.length > 1 && (
              <div className="bg-white rounded-xl shadow-sm p-2 flex flex-wrap gap-2" data-tour="academias">
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${
                      p.id === selectedId ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.academyName ?? 'Academia'}
                  </button>
                ))}
              </div>
            )}

            {/* Student card with editable photo */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-start gap-5">
                <div className="flex-shrink-0 w-40" data-tour="photo">
                  <ImageUpload
                    value={student.photoUrl}
                    onFile={handlePhotoUpload}
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

            {/* Technical sheets per discipline */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Fichas técnicas</h2>
                <p className="text-xs text-gray-400 mt-0.5">{disciplines.length} disciplina{disciplines.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="p-5 space-y-4">
                {detailLoading ? (
                  <Spinner />
                ) : disciplines.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">Sin disciplinas registradas</p>
                ) : (
                  disciplines.map((disc, idx) => {
                    const isExpanded = expandedDisc === disc.id;
                    const discPromos = promotions.filter((p) => p.studentDisciplineId === disc.id && !p.deleted);
                    return (
                      <div key={disc.id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-3 p-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap" data-tour={idx === 0 ? 'grados' : undefined}>
                              <span className="font-semibold text-gray-900 text-sm">{disc.disciplineName}</span>
                              {disc.ageCategoryName && (
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{disc.ageCategoryName}</span>
                              )}
                              {disc.belt && <BeltBadge belt={disc.belt} colorHex={disc.beltColorHex} />}
                              {disc.stripes > 0 && <span className="text-amber-400 text-xs">{'★'.repeat(disc.stripes)}</span>}
                            </div>
                            {disc.joinDate && <p className="text-xs text-gray-400 mt-1">Ingresó: {formatDate(disc.joinDate)}</p>}
                          </div>
                          <button
                            data-tour={idx === 0 ? 'historial' : undefined}
                            onClick={() => setExpandedDisc(isExpanded ? null : disc.id)}
                            className={`text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-colors flex-shrink-0 ${
                              isExpanded ? 'bg-primary-50 border-primary-300 text-primary-700' : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-700'
                            }`}
                          >
                            📋 Historial
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-5">
                            {/* Belt / grade history */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Historial de graduaciones</h4>
                              {discPromos.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-2">Sin registros</p>
                              ) : (
                                <div className="space-y-2">
                                  {discPromos.map((promo) => {
                                    const tc = TYPE_CONFIG[promo.type];
                                    return (
                                      <div key={promo.id} className="flex items-start gap-3 bg-white rounded-lg p-3 border border-gray-100">
                                        <span className="text-base mt-0.5 flex-shrink-0">{tc.icon}</span>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-xs font-semibold ${tc.color}`}>{tc.label}</span>
                                            {promo.fromBelt && (
                                              <>
                                                <BeltBadge belt={promo.fromBelt} />
                                                <span className="text-gray-300 text-xs">→</span>
                                              </>
                                            )}
                                            <BeltBadge belt={promo.toBelt} />
                                            {promo.toStripes > 0 && <span className="text-amber-400 text-xs">{'★'.repeat(promo.toStripes)}</span>}
                                          </div>
                                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-400">
                                            <span>{formatDate(promo.promotionDate)}</span>
                                            {promo.notes && <span className="italic">"{promo.notes}"</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Competition results */}
                            <div>
                              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-3">Resultados de competición</h4>
                              {disc.competitionResults.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
                              ) : (
                                <div className="space-y-2">
                                  {disc.competitionResults.map((result) => (
                                    <div key={result.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                      <p className="font-medium text-sm text-gray-900">{result.tournamentName}</p>
                                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                                        <span>{formatDate(result.date)}</span>
                                        {result.placement && <span>🏅 {result.placement}</span>}
                                        {result.category && <span>⚖️ {result.category}</span>}
                                      </div>
                                      {result.notes && <p className="text-xs text-gray-400 italic mt-1">"{result.notes}"</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Payments */}
            <div className="bg-white rounded-xl shadow-sm" data-tour="pagos">
              <div className="p-5 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Mis pagos</h2>
                <p className="text-xs text-gray-400 mt-0.5">{payments.length} registro{payments.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="p-5">
                {detailLoading ? (
                  <Spinner />
                ) : payments.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-4">Sin pagos registrados</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((pay) => {
                      const pending = (pay.remaining ?? 0) > 0;
                      return (
                        <div key={pay.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900">{MONTHS[pay.month - 1]} {pay.year}</p>
                            {pay.paidAt && <p className="text-xs text-gray-400">Pagado el {formatDate(pay.paidAt)}</p>}
                            {pay.notes && <p className="text-xs text-gray-400 italic mt-0.5">"{pay.notes}"</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-gray-900">{money(pay.amount)}</p>
                            {pending ? (
                              <p className="text-xs text-red-500">Saldo {money(pay.remaining)}</p>
                            ) : (
                              <p className="text-xs text-green-600">Al día</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-gray-400">{label}</dt>
      <dd className="text-gray-800">{value}</dd>
    </div>
  );
}
