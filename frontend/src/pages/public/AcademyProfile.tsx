import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Lightbox from 'yet-another-react-lightbox';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { academiesApi } from '../../api/academies';
import type { AcademyPublic } from '../../types';

const DAY_ORDER = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function sortByDay(a: string, b: string) {
  return DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b);
}

const CLASS_COLORS = ['#EF4444','#3B82F6','#22C55E','#F59E0B','#8B5CF6','#EC4899','#06B6D4','#F97316'];
function classColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CLASS_COLORS[h % CLASS_COLORS.length];
}
function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export default function AcademyProfile() {
  const { id } = useParams<{ id: string }>();
  const [academy, setAcademy] = useState<AcademyPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  useEffect(() => {
    if (id) {
      academiesApi.get(Number(id)).then(setAcademy).finally(() => setLoading(false));
    }
  }, [id]);

  if (loading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  if (!academy)
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-gray-400 gap-4">
        <span className="text-5xl">🥋</span>
        <p>Academia no encontrada</p>
        <Link to="/" className="text-primary-400 hover:text-primary-300 text-sm">← Volver al listado</Link>
      </div>
    );

  // Group schedules by day, sorted by startTime within each day
  const schedulesByDay = academy.schedules.reduce<Record<string, typeof academy.schedules>>((acc, s) => {
    if (!acc[s.dayOfWeek]) acc[s.dayOfWeek] = [];
    acc[s.dayOfWeek].push(s);
    return acc;
  }, {});

  // Sort each day's classes by startTime ascending
  for (const day of Object.keys(schedulesByDay)) {
    schedulesByDay[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const sortedDays = Object.keys(schedulesByDay).sort(sortByDay);
  const openTournaments = academy.tournaments.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const pastTournaments = academy.tournaments.filter((t) => t.status === 'COMPLETED');

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900/30 to-gray-950" />
        {academy.logoUrl && (
          <div className="absolute inset-0">
            <img src={academy.logoUrl} alt="" className="w-full h-full object-cover opacity-15 blur-sm" />
          </div>
        )}
        <div className="relative max-w-5xl mx-auto px-4 pt-8 pb-12 sm:px-6 lg:px-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors mb-8">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver al listado
          </Link>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Logo */}
            <div className="w-24 h-24 bg-gray-800 border border-gray-700 rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
              {academy.logoUrl ? (
                <img src={academy.logoUrl} alt={academy.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black text-gray-600">{academy.name.charAt(0)}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{academy.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-400">
                {academy.address && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {academy.address}
                  </span>
                )}
                {academy.whatsapp && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {academy.whatsapp}
                  </span>
                )}
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 mt-4">
                {academy.schedules.length > 0 && (
                  <button
                    onClick={() => document.getElementById('section-clases')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-gray-900 border border-gray-800 hover:border-primary-500/50 hover:bg-gray-800 rounded-lg px-3 py-2 text-center transition-colors cursor-pointer"
                  >
                    <p className="text-lg font-bold text-white">{academy.schedules.length}</p>
                    <p className="text-xs text-gray-500">Clases</p>
                  </button>
                )}
                {academy.tournaments.length > 0 && (
                  <button
                    onClick={() => document.getElementById('section-torneos')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-gray-900 border border-gray-800 hover:border-primary-500/50 hover:bg-gray-800 rounded-lg px-3 py-2 text-center transition-colors cursor-pointer"
                  >
                    <p className="text-lg font-bold text-white">{academy.tournaments.length}</p>
                    <p className="text-xs text-gray-500">Torneos</p>
                  </button>
                )}
                {academy.photos.length > 0 && (
                  <button
                    onClick={() => document.getElementById('section-fotos')?.scrollIntoView({ behavior: 'smooth' })}
                    className="bg-gray-900 border border-gray-800 hover:border-primary-500/50 hover:bg-gray-800 rounded-lg px-3 py-2 text-center transition-colors cursor-pointer"
                  >
                    <p className="text-lg font-bold text-white">{academy.photos.length}</p>
                    <p className="text-xs text-gray-500">Fotos</p>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 sm:px-6 lg:px-8 space-y-12">
        {/* Description */}
        {academy.description && (
          <section>
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full" />
              Sobre nosotros
            </h2>
            <p className="text-gray-400 leading-relaxed max-w-3xl">{academy.description}</p>
          </section>
        )}

        {/* Location */}
        {academy.address && (
          <section>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full" />
              Ubicación
            </h2>
            <div className="rounded-xl overflow-hidden border border-gray-800">
              {/* Map embed */}
              <div className="relative w-full h-72 bg-gray-900">
                <iframe
                  title="Ubicación de la academia"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(academy.address)}&output=embed&z=15`}
                  className="w-full h-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              {/* Footer bar with address + button */}
              <div className="bg-gray-900 px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <svg className="w-4 h-4 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{academy.address}</span>
                </div>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(academy.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:text-primary-300 border border-primary-500/30 hover:border-primary-400 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Ver en Google Maps
                </a>
              </div>
            </div>
          </section>
        )}

        {/* Schedules */}
        {sortedDays.length > 0 && (
          <section id="section-clases">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full" />
              Horarios de Clases
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {sortedDays.map((day) => {
                const classes = schedulesByDay[day];
                // Use the first class color as the day's accent tint
                const dayColor = classColor(classes[0].className);
                return (
                  <div key={day} className="rounded-xl overflow-hidden border border-gray-800">
                    {/* Day header — tinted with first class color */}
                    <div
                      className="px-4 py-2.5 flex items-center justify-between"
                      style={{ background: hexAlpha(dayColor, 0.18), borderBottom: `1px solid ${hexAlpha(dayColor, 0.3)}` }}
                    >
                      <h3 className="text-sm font-bold text-white uppercase tracking-wide">{day}</h3>
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: hexAlpha(dayColor, 0.25), color: '#fff' }}
                      >
                        {classes.length} {classes.length === 1 ? 'clase' : 'clases'}
                      </span>
                    </div>
                    {/* Class cards */}
                    <div className="bg-gray-900 p-3 space-y-2">
                      {classes.map((s, i) => {
                        const color = classColor(s.className);
                        return (
                          <div
                            key={i}
                            className="relative rounded-lg overflow-hidden pl-4 pr-3 py-2.5"
                            style={{ background: hexAlpha(color, 0.15), border: `1px solid ${hexAlpha(color, 0.3)}` }}
                          >
                            <span
                              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
                              style={{ background: color }}
                            />
                            <p className="text-sm font-semibold text-white leading-tight">{s.className}</p>
                            <p className="text-xs mt-0.5 text-gray-400">
                              {s.startTime.slice(0, 5)} – {s.endTime.slice(0, 5)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Active Tournaments */}
        {openTournaments.length > 0 && (
          <section id="section-torneos">
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full" />
              Torneos Activos
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {openTournaments.map((t) => (
                <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-primary-500/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-white">{t.name}</h3>
                      <p className="text-gray-500 text-sm mt-1">
                        {new Date(t.date).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${
                      t.status === 'OPEN' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                    }`}>
                      {t.status === 'OPEN' ? 'Abierto' : 'En curso'}
                    </span>
                  </div>
                  <div className="mt-3 text-sm text-gray-500">{t.participantCount} participantes</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Photos Gallery */}
        {academy.photos.length > 0 && (
          <section id="section-fotos">
            {/* Section header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="block w-1 h-8 bg-primary-500" style={{ clipPath: 'polygon(0 0, 100% 10%, 100% 90%, 0 100%)' }} />
                <h2 className="text-2xl font-black uppercase tracking-widest text-white">Galería</h2>
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-primary-500/60 to-transparent" />
              <span className="text-xs font-mono text-primary-400 tracking-widest">
                {String(academy.photos.length).padStart(2, '0')} FOTOS
              </span>
            </div>

            {/* Hero carousel — first 5 photos */}
            <div className="relative rounded-xl overflow-hidden mb-3 group/carousel">
              <Swiper
                modules={[Autoplay, Navigation, Pagination]}
                autoplay={{ delay: 4000, disableOnInteraction: false, pauseOnMouseEnter: true }}
                navigation
                pagination={{ clickable: true }}
                loop={academy.photos.length > 1}
                className="h-72 sm:h-96"
              >
                {academy.photos.slice(0, 5).map((photo, index) => (
                  <SwiperSlide key={photo.id}>
                    <button
                      onClick={() => setLightboxIndex(index)}
                      className="w-full h-full block outline-none"
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || ''}
                        className="w-full h-full object-cover brightness-75 hover:brightness-60 transition-[filter] duration-300"
                      />
                      {photo.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-4">
                          <p className="text-sm font-bold text-white truncate">{photo.caption}</p>
                        </div>
                      )}
                    </button>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>

            {/* Remaining photos grid */}
            {academy.photos.length > 5 && (
              <div
                className="grid gap-1.5"
                style={{ gridTemplateColumns: 'repeat(3, 1fr)', gridAutoRows: '140px' }}
              >
                {academy.photos.slice(5).map((photo, i) => (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxIndex(i + 5)}
                    className="relative overflow-hidden group outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || ''}
                      className="w-full h-full object-cover brightness-75 group-hover:brightness-50 group-hover:scale-110 transition-all duration-500"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-tr from-primary-900/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
                    {photo.caption && (
                      <div className="absolute bottom-2 left-3 right-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                        <p className="text-xs font-bold uppercase tracking-wider text-white truncate">{photo.caption}</p>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <Lightbox
              open={lightboxIndex >= 0}
              index={lightboxIndex}
              close={() => setLightboxIndex(-1)}
              slides={academy.photos.map((p) => ({
                src: p.url,
                title: p.caption || undefined,
              }))}
              plugins={[Zoom, Thumbnails, Captions]}
              zoom={{ maxZoomPixelRatio: 3 }}
              thumbnails={{ position: 'bottom', width: 80, height: 60, gap: 6 }}
              captions={{ showToggle: true }}
              styles={{ container: { backgroundColor: 'rgba(0,0,0,0.97)' } }}
            />
          </section>
        )}

        {/* Past Tournaments */}
        {pastTournaments.length > 0 && (
          <section id={openTournaments.length === 0 ? 'section-torneos' : undefined}>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full" />
              Torneos Anteriores
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pastTournaments.map((t) => (
                <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-300">{t.name}</h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    <span>{new Date(t.date).toLocaleDateString('es-CL')}</span>
                    <span>{t.participantCount} participantes</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Plans */}
        {academy.plans && academy.plans.length > 0 && (
          <section>
            <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
              <span className="w-1 h-6 bg-primary-500 rounded-full" />
              Planes y Tarifas
            </h2>
            <p className="text-gray-500 text-sm mb-6">Elige el plan que mejor se adapte a ti.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {academy.plans.map((plan) => (
                <div
                  key={plan.id}
                  className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col gap-4 hover:border-primary-500/40 transition-colors"
                >
                  <div>
                    <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                    {plan.description && (
                      <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
                    )}
                  </div>

                  {plan.price > 0 && (
                    <div>
                      <span className="text-3xl font-extrabold text-white">
                        ${plan.price.toLocaleString('es-CL')}
                      </span>
                      <span className="text-gray-500 text-sm ml-1">/ mes</span>
                    </div>
                  )}

                  {plan.features && (
                    <ul className="space-y-2 flex-1">
                      {plan.features.split('\n').filter(Boolean).map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                          <span className="text-primary-400 font-bold mt-0.5 flex-shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}

                  {academy.whatsapp && (
                    <a
                      href={`https://wa.me/${academy.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, me interesa el plan "${plan.name}"`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-auto block text-center bg-primary-600 hover:bg-primary-500 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                    >
                      Consultar por WhatsApp
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating social buttons */}
      {(academy.whatsapp || academy.instagram) && (
        <div className="fixed bottom-6 right-5 flex flex-col items-center gap-3 z-40">
          {academy.instagram && (
            <a
              href={`https://instagram.com/${academy.instagram.trim().replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              title="Instagram"
              className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 flex items-center justify-center shadow-lg hover:shadow-pink-500/30 hover:scale-110 transition-all"
            >
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
            </a>
          )}
          {academy.whatsapp && (
            <a
              href={`https://wa.me/${academy.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent('Hola, me interesa información sobre las clases de Jiu-Jitsu')}`}
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp"
              className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-400 flex items-center justify-center shadow-lg hover:shadow-green-500/30 hover:scale-110 transition-all"
            >
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </a>
          )}
        </div>
      )}

    </div>
  );
}
