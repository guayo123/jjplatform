import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '../../api/portal';
import { useAuthStore } from '../../stores/authStore';
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
import { usePlatform } from '../../native/usePlatform';
import { registerPush } from '../../native/push';
import { tapLight, notifySuccess } from '../../native/haptics';
import PullToRefresh from '../../native/PullToRefresh';
import PortalTabs, { type PortalTab } from './PortalTabs';
import PortalGuideNative from './PortalGuideNative';
import PromotionCelebration from './PromotionCelebration';
import { beltSwatchColor } from '../../components/BeltImage';
import PerfilSection from './sections/PerfilSection';
import FichasSection from './sections/FichasSection';
import PagosSection from './sections/PagosSection';
import TrainingSection from './sections/TrainingSection';
import UpcomingClassesCard from './sections/UpcomingClassesCard';
import DuelsSection from './sections/DuelsSection';
import { Spinner } from './sections/shared';
import type { Student, StudentDiscipline, BeltPromotion, Payment, TechniqueCurriculum, PaymentOptions } from '../../types';

// localStorage value 'dismissed' = the student ticked "don't show again". Any other value (incl. absent)
// means the tour auto-runs on every entry.
const TOUR_KEY = 'jjp_portal_tour';

export default function Portal() {
  const navigate = useNavigate();
  const { email, logout } = useAuthStore();
  const { isNative } = usePlatform();
  // Layout flag: true in the real app, or in a browser when previewing with ?native=1.
  // Only drives presentation (tabs vs scroll); real native features stay gated on isNative.
  const tabbed = isNative || (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('native'));
  const [profiles, setProfiles] = useState<Student[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Per-profile detail
  const [disciplines, setDisciplines] = useState<StudentDiscipline[]>([]);
  const [promotions, setPromotions] = useState<BeltPromotion[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentOptions, setPaymentOptions] = useState<PaymentOptions | null>(null);
  const [curriculum, setCurriculum] = useState<TechniqueCurriculum[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [expandedDisc, setExpandedDisc] = useState<number | null>(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Portal cover/banner (per account)
  const [banner, setBanner] = useState<string | null>(null);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  // Native bottom-tab navigation (only used inside the app).
  const [tab, setTab] = useState<PortalTab>('entreno');

  // Belt-promotion celebration: shown when the academy registers a new promotion the student hasn't seen.
  const [celebrate, setCelebrate] = useState<BeltPromotion | null>(null);

  // Guided tour. Auto-runs once the data is loaded unless the student ticked "don't show again".
  const tourStartedRef = useRef(false);
  // Native help: a self-contained walkthrough (the web Driver.js tour can't anchor to
  // elements that live in inactive tabs). Web keeps using the element-anchored tour.
  const [showGuide, setShowGuide] = useState(false);

  const loadProfiles = useCallback(async () => {
    const [list, b] = await Promise.all([portalApi.me(), portalApi.getBanner().catch(() => null)]);
    setProfiles(list);
    setSelectedId((prev) => (prev != null && list.some((p) => p.id === prev) ? prev : list[0]?.id ?? null));
    setBanner((b as string | null) ?? null);
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setExpandedDisc(null);
    try {
      const [d, p, pay, tech, opts] = await Promise.all([
        portalApi.disciplines(id),
        portalApi.beltPromotions(id),
        portalApi.payments(id),
        portalApi.techniques(id).catch(() => [] as TechniqueCurriculum[]),
        portalApi.paymentOptions(id).catch(() => null),
      ]);
      setDisciplines(d);
      setPromotions(p);
      setPayments(pay);
      setCurriculum(tech);
      setPaymentOptions(opts);
    } catch {
      setDisciplines([]);
      setPromotions([]);
      setPayments([]);
      setCurriculum([]);
      setPaymentOptions(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfiles()
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo cargar tu información.'))
      .finally(() => setLoading(false));
  }, [loadProfiles]);

  // Native-only: register for push (scaffolding). Runs once. The streak reminders are
  // scheduled from TrainingSection, where the streak/session data lives.
  useEffect(() => {
    if (!isNative) return;
    void registerPush();
  }, [isNative]);

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
    void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // Celebrate a belt promotion the academy registered while the student wasn't looking.
  useEffect(() => {
    if (detailLoading || selectedId == null) return;
    const promo = pickCelebration(promotions, selectedId);
    if (promo) setCelebrate(promo);
  }, [promotions, detailLoading, selectedId]);

  const handleRefresh = useCallback(async () => {
    try {
      await loadProfiles();
      if (selectedId != null) await loadDetail(selectedId);
      await notifySuccess();
    } catch {
      /* keep current data on a failed refresh */
    }
  }, [loadProfiles, loadDetail, selectedId]);

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
      void notifySuccess();
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Optimistically flip a technique's learned flag (and the running counts), then persist.
  const handleToggleTechnique = useCallback((techniqueId: number, learned: boolean) => {
    if (selectedId == null) return;
    setCurriculum((prev) =>
      prev.map((disc) => {
        let discDelta = 0;
        const belts = disc.belts.map((g) => {
          let found = false;
          const techniques = g.techniques.map((t) => {
            if (t.id !== techniqueId || !!t.learned === learned) return t;
            found = true;
            return { ...t, learned };
          });
          if (!found) return g;
          const delta = learned ? 1 : -1;
          discDelta += delta;
          return { ...g, techniques, learnedCount: g.learnedCount + delta };
        });
        return discDelta === 0 ? disc : { ...disc, belts, learnedCount: disc.learnedCount + discDelta };
      }),
    );
    portalApi.setTechniqueLearned(selectedId, techniqueId, learned).catch(() => {
      // Revert on failure by reloading the curriculum for the selected profile.
      portalApi.techniques(selectedId).then(setCurriculum).catch(() => undefined);
    });
  }, [selectedId]);

  const student = profiles.find((p) => p.id === selectedId) ?? null;

  const runTour = () => {
    if (!student) return;
    // Native (tabbed) layout: element-anchored steps can't reach other tabs — use the guide.
    if (tabbed) {
      setShowGuide(true);
      return;
    }
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

  const perfil = student && (
    <PerfilSection
      student={student}
      uploading={uploading}
      uploadProgress={uploadProgress}
      onPhotoUpload={handlePhotoUpload}
    />
  );
  const fichas = (
    <FichasSection
      disciplines={disciplines}
      promotions={promotions}
      detailLoading={detailLoading}
      expandedDisc={expandedDisc}
      setExpandedDisc={setExpandedDisc}
      curriculum={curriculum}
      onToggleTechnique={handleToggleTechnique}
    />
  );
  const pagos = student && (
    <PagosSection payments={payments} detailLoading={detailLoading} studentId={student.id} options={paymentOptions} />
  );
  const entreno = student && (
    <div className="space-y-6">
      <TrainingSection
        studentId={student.id}
        disciplines={disciplines}
        studentName={student.name}
        academyName={student.academyName}
      />
      <UpcomingClassesCard studentId={student.id} />
    </div>
  );
  const retos = student && <DuelsSection studentId={student.id} />;

  const content = (
    <div className="min-h-screen bg-gray-100 portal-theme" data-theme="ember">
      <header
        className="relative overflow-hidden bg-gray-900 text-white pt-safe"
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
              onClick={() => { void tapLight(); setShowBannerPicker((v) => !v); }}
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
            {/* Greet by first name — the email reads like a debug screen, not an app. */}
            <p className="font-semibold text-lg truncate [text-shadow:_0_1px_4px_rgb(0_0_0_/_60%)]">
              {student ? `Hola, ${student.name.trim().split(/\s+/)[0]} 👋` : email}
            </p>
            <HeaderBeltChips student={student} />
          </div>
        </div>
      </header>

      <main className={`max-w-3xl mx-auto px-4 py-6 space-y-6 ${tabbed ? 'pb-28' : ''}`}>
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

            {/* Web: everything in one scroll. App (or ?native=1 preview): only the active tab. */}
            {tabbed ? (
              tab === 'entreno' ? entreno
                : tab === 'retos' ? retos
                : tab === 'fichas' ? fichas
                : tab === 'pagos' ? pagos
                : perfil
            ) : (
              <>
                {entreno}
                {retos}
                {perfil}
                {fichas}
                {pagos}
              </>
            )}
          </>
        )}
      </main>

      {tabbed && student && (
        <PortalTabs active={tab} onChange={setTab} />
      )}

      {showGuide && student && (
        <PortalGuideNative
          firstName={student.name.split(' ')[0] || student.name}
          multiAcademy={profiles.length > 1}
          initialDismiss={localStorage.getItem(TOUR_KEY) === 'dismissed'}
          onFinish={(dismissForever) => {
            if (dismissForever) localStorage.setItem(TOUR_KEY, 'dismissed');
            else localStorage.removeItem(TOUR_KEY);
            setShowGuide(false);
          }}
        />
      )}

      {celebrate && (
        <PromotionCelebration promotion={celebrate} onClose={() => setCelebrate(null)} />
      )}
    </div>
  );

  // Wrap with native pull-to-refresh (no-op on web).
  return <PullToRefresh onRefresh={handleRefresh}>{content}</PullToRefresh>;
}

/**
 * Compact belt graphic for the header chip: the belt color + the dark tip panel with its
 * degree stripes, mirroring BeltImage (black belts use a red panel with yellow stripes).
 */
function BeltSwatch({ belt, stripes, colorHex }: { belt: string; stripes: number; colorHex?: string | null }) {
  const isBlack = !colorHex && belt === 'Negro';
  const panel = isBlack ? '#DC2626' : '#111827';
  const stripeColor = isBlack ? '#FCD34D' : '#FFFFFF';
  return (
    <span className="flex h-3.5 w-9 flex-shrink-0 overflow-hidden rounded-sm shadow-[inset_0_0_0_1px_rgba(0,0,0,0.3)]">
      <span className="flex-1" style={{ backgroundColor: beltSwatchColor(belt, colorHex) }} />
      <span className="flex items-center justify-center gap-[1.5px] px-[3px]" style={{ backgroundColor: panel }}>
        {Array.from({ length: Math.min(stripes, 6) }).map((_, i) => (
          <span key={i} className="h-2 w-[1.5px] rounded-full" style={{ backgroundColor: stripeColor }} />
        ))}
      </span>
    </span>
  );
}

/**
 * Belt chips shown under the email in the header: one per discipline the student trains.
 * Each chip is a small colored band (the belt color) + belt name + degrees, on a translucent
 * dark pill so it reads over any cover. The discipline name is shown only when there's more
 * than one, to disambiguate without cluttering the single-discipline case.
 */
function HeaderBeltChips({ student }: { student: Student | null }) {
  const belts = student?.disciplineBelts ?? [];
  if (belts.length === 0) return null;
  const showDiscipline = belts.length > 1;

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {belts.map((b) => (
        <span
          key={b.disciplineId}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-black/25 py-1 pl-1 pr-2.5 backdrop-blur-sm"
        >
          <BeltSwatch belt={b.belt} stripes={b.stripes} colorHex={b.beltColorHex} />
          <span className="text-xs font-semibold text-white">
            {showDiscipline && <span className="font-medium text-white/70">{b.disciplineName}: </span>}
            {b.belt}
            {b.stripes > 0 && <span className="text-white/80"> · {b.stripes}°</span>}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Returns a promotion to celebrate, or null. Celebrates only belt/grade promotions
 * (not degradations) that are newer than the last one the student has seen, and recent
 * (≤30 days) to avoid confetti over backfilled history. The first time we ever see a
 * student we silently set the baseline so old promotions don't trigger a celebration.
 */
function pickCelebration(promotions: BeltPromotion[], studentId: number): BeltPromotion | null {
  const candidates = promotions.filter(
    (p) => !p.deleted && (p.type === 'PROMOCION' || p.type === 'GRADO'),
  );
  if (candidates.length === 0) return null;

  const newest = candidates.reduce((a, b) => (b.id > a.id ? b : a));
  const key = `jjp_promo_seen_${studentId}`;
  const storedRaw = localStorage.getItem(key);

  // First load for this student: establish baseline, don't celebrate the past.
  if (storedRaw == null) {
    localStorage.setItem(key, String(newest.id));
    return null;
  }
  if (newest.id <= Number(storedRaw)) return null;

  // Mark as seen now so it won't re-fire even if the student dismisses it.
  localStorage.setItem(key, String(newest.id));

  const ageDays = (Date.now() - new Date(newest.promotionDate).getTime()) / 86_400_000;
  return ageDays <= 30 ? newest : null;
}
