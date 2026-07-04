import { useCallback, useEffect, useRef, useState } from 'react';
import type { Classmate, Duel, DuelCloseReason, DuelFormat, DuelMethod, DuelRankingEntry, TrainingModality } from '../../../types';
import { duelsApi, type DuelFeedTab } from '../../../api/duels';
import { trainingApi } from '../../../api/training';
import { useToast } from '../../../components/ToastContext';
import { notifyNow } from '../../../native/notifications';
import { tapLight, notifySuccess } from '../../../native/haptics';
import { playDuelo } from '../../../native/sound';
import BeltImage from '../../../components/BeltImage';
import StudentInfoModal from './StudentInfoModal';
import { formatDate, CardSkeleton } from './shared';

interface Props {
  studentId: number;
}

const MODALITY_LABEL: Record<string, string> = { GI: 'Gi', NOGI: 'No-Gi' };
const FORMAT_LABEL: Record<DuelFormat, string> = {
  SUBMISSION: 'Sumisión',
  COMBAT_JJ: 'Combat Jiu-Jitsu',
  MMA: 'MMA',
  NO_RULES: 'Sin reglas (ADCC)',
};

/** "Sumisión · Gi", "MMA", or just "Gi" for legacy duels with no explicit format. */
function formatLabel(d: Duel): string | null {
  const parts: string[] = [];
  if (d.format) parts.push(FORMAT_LABEL[d.format]);
  if (d.modality && (d.format === 'SUBMISSION' || d.format == null)) parts.push(MODALITY_LABEL[d.modality]);
  return parts.length ? parts.join(' · ') : null;
}
const METHOD_LABEL: Record<DuelMethod, string> = {
  SUBMISSION: 'Sumisión',
  POINTS: 'Puntos',
  DECISION: 'Decisión',
  DRAW: 'Empate',
  DISQUALIFICATION: 'Descalificación',
};
const SUBMISSION_CHIPS = ['Mataleón', 'Llave de brazo', 'Triángulo', 'Kimura', 'Guillotina', 'Americana'];

/** "📅 sáb 21 jun, 18:30 · 📍 Tatami 2" — omits whichever piece wasn't set. */
function formatSchedule(scheduledAt: string | null, location: string | null): string | null {
  const parts: string[] = [];
  if (scheduledAt) {
    const d = new Date(scheduledAt);
    if (!Number.isNaN(d.getTime())) {
      parts.push('📅 ' + d.toLocaleString('es-CL', {
        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      }));
    }
  }
  if (location) parts.push('📍 ' + location);
  return parts.length ? parts.join(' · ') : null;
}

function other(d: Duel, me: number) {
  return d.challengerId === me
    ? { id: d.opponentId, name: d.opponentName, photo: d.opponentPhotoUrl }
    : { id: d.challengerId, name: d.challengerName, photo: d.challengerPhotoUrl };
}

const FEED_PAGE_SIZE = 20;

interface FeedState {
  items: Duel[];
  hasMore: boolean;
  loading: boolean;
  loadMore: () => void;
  reload: () => void;
}

/**
 * Keyset-paginated academy feed for one tab. Loads the first page on mount and appends older pages
 * on demand (scroll / button). Cursor + hasMore live in refs so the callbacks stay stable and free
 * of stale closures; an in-flight guard prevents double fetches from a fast scroll.
 */
function usePaginatedFeed(studentId: number, tab: DuelFeedTab): FeedState {
  const [items, setItems] = useState<Duel[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const busyRef = useRef(false);

  const load = useCallback(async (reset: boolean) => {
    if (busyRef.current) return;
    if (!reset && !hasMoreRef.current) return;
    busyRef.current = true;
    setLoading(true);
    try {
      const page = await duelsApi.feedPage(studentId, tab, reset ? null : cursorRef.current, FEED_PAGE_SIZE);
      cursorRef.current = page.nextCursor;
      hasMoreRef.current = page.nextCursor != null;
      setHasMore(page.nextCursor != null);
      setItems((prev) => (reset ? page.items : [...prev, ...page.items]));
    } catch {
      if (reset) { setItems([]); hasMoreRef.current = false; setHasMore(false); }
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }, [studentId, tab]);

  // (Re)load the first page on mount and whenever the student/tab changes.
  useEffect(() => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    void load(true);
  }, [load]);

  return {
    items,
    hasMore,
    loading,
    loadMore: useCallback(() => void load(false), [load]),
    reload: useCallback(() => void load(true), [load]),
  };
}

/** "Retos" — challenge classmates, respond, report results, and see the academy feed. */
export default function DuelsSection({ studentId }: Props) {
  const { toast } = useToast();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [ranking, setRanking] = useState<DuelRankingEntry[]>([]);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [resultFor, setResultFor] = useState<Duel | null>(null);
  const [closeFor, setCloseFor] = useState<Duel | null>(null); // accepted duel being closed early
  const [cardFor, setCardFor] = useState<number | null>(null); // ranking → student info modal
  const [detailDuel, setDetailDuel] = useState<Duel | null>(null);
  const [feedTab, setFeedTab] = useState<DuelFeedTab>('results'); // academy feed tabs

  // Each tab is its own keyset-paginated stream (separate queries → accurate, scalable).
  const resultsFeed = usePaginatedFeed(studentId, 'results');
  const unresolvedFeed = usePaginatedFeed(studentId, 'unresolved');
  const activeFeed = feedTab === 'results' ? resultsFeed : unresolvedFeed;
  const reloadFeeds = useCallback(() => { resultsFeed.reload(); unresolvedFeed.reload(); }, [resultsFeed, unresolvedFeed]);

  // Fire toast + local notification for status changes the student hasn't seen yet.
  const notifyChanges = useCallback((current: Duel[]) => {
    const key = `jjp_duel_seen_${studentId}`;
    const storedRaw = localStorage.getItem(key);
    const curMap: Record<string, string> = {};
    current.forEach((d) => { curMap[d.id] = d.status; });

    if (storedRaw == null) {
      localStorage.setItem(key, JSON.stringify(curMap)); // baseline, don't notify history
      return;
    }
    const stored: Record<string, string> = JSON.parse(storedRaw);
    for (const d of current) {
      const prev = stored[d.id];
      const o = other(d, studentId);
      if (d.challengerId === studentId && prev === 'PENDING' && d.status === 'ACCEPTED') {
        toast.success(`${o.name} aceptó tu reto 🔥`);
        void notifyNow('¡Reto aceptado! 🔥', `${o.name} aceptó tu duelo. ¡A prepararse!`);
      } else if (d.challengerId === studentId && prev === 'PENDING' && d.status === 'REJECTED') {
        toast.success(`${o.name} rechazó tu reto`);
        void notifyNow('Reto rechazado', `${o.name} rechazó tu duelo.`);
      } else if (d.opponentId === studentId && prev === undefined && d.status === 'PENDING') {
        toast.success(`${o.name} te retó a una lucha ⚔️`);
        void notifyNow('¡Nuevo reto! ⚔️', `${o.name} te retó a una lucha.`);
      } else if (d.refereeId === studentId && prev === undefined) {
        toast.success(`Te eligieron como árbitro ⚖️`);
        void notifyNow('Eres árbitro ⚖️', `${d.challengerName} vs ${d.opponentName} — tú das el veredicto.`);
      } else if (d.refereeId === studentId && prev === 'PENDING' && d.status === 'ACCEPTED') {
        void notifyNow('Duelo listo para arbitrar ⚖️', `${d.challengerName} vs ${d.opponentName} — registra el resultado al terminar.`);
      }
    }
    localStorage.setItem(key, JSON.stringify(curMap));
  }, [studentId, toast]);

  // Broadcast academy-wide: announce duel milestones (confirmed bout + result) to the whole academy
  // as a local notification on each device's next refresh — we have no server push. A status map
  // (id → last-seen status) fires once per transition: once when ACCEPTED, once when COMPLETED.
  const notifyFeedResults = useCallback((current: Duel[]) => {
    const key = `jjp_duel_feed_seen_${studentId}`;
    const relevant = current.filter((d) => d.status === 'ACCEPTED' || d.status === 'COMPLETED');
    const curMap: Record<string, string> = {};
    relevant.forEach((d) => { curMap[d.id] = d.status; });
    const storedRaw = localStorage.getItem(key);
    if (storedRaw == null) {
      localStorage.setItem(key, JSON.stringify(curMap)); // baseline, don't replay history
      return;
    }
    const stored: Record<string, string> = JSON.parse(storedRaw);
    for (const d of relevant) {
      if (stored[d.id] === d.status) continue; // already announced this state
      if (d.status === 'ACCEPTED') {
        // Duel confirmed — tell the academy. Participants & referee get their own (richer) alerts.
        if (d.challengerId === studentId || d.opponentId === studentId || d.refereeId === studentId) continue;
        const sched = formatSchedule(d.scheduledAt, d.location);
        void notifyNow('⚔️ Duelo confirmado', `${d.challengerName} vs ${d.opponentName}${sched ? ` — ${sched}` : ''}`);
      } else {
        // COMPLETED — skip the reporter, who already knows.
        if (d.reportedBy === studentId) continue;
        if (d.winnerStudentId == null) {
          void notifyNow('🤝 Duelo en la academia', `${d.challengerName} y ${d.opponentName} terminaron en empate.`);
        } else {
          const loser = d.winnerStudentId === d.challengerId ? d.opponentName : d.challengerName;
          void notifyNow('🏆 ¡Victoria en la academia!', `${d.winnerName} venció a ${loser}.`);
        }
      }
    }
    localStorage.setItem(key, JSON.stringify(curMap));
  }, [studentId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, fed, rank, mates] = await Promise.all([
        duelsApi.mine(studentId),
        duelsApi.feed(studentId),
        duelsApi.ranking(studentId).catch(() => [] as DuelRankingEntry[]),
        trainingApi.classmates(studentId).catch(() => [] as Classmate[]),
      ]);
      setDuels(mine);
      setRanking(rank);
      setClassmates(mates);
      notifyChanges(mine);
      notifyFeedResults(fed);
    } catch {
      setDuels([]);
      setRanking([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, notifyChanges, notifyFeedResults]);

  useEffect(() => { void load(); }, [load]);

  const respond = async (d: Duel, accept: boolean) => {
    void tapLight();
    if (accept) playDuelo(); // duel cue on accepting, within the tap gesture
    try {
      await duelsApi.respond(studentId, d.id, accept);
      if (accept) void notifySuccess();
      await load();
      reloadFeeds(); // a rejection lands in the results tab
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo responder.');
    }
  };

  const cancel = async (d: Duel) => {
    try {
      await duelsApi.cancel(studentId, d.id);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cancelar.');
    }
  };

  const closeDuel = async (d: Duel, reason: DuelCloseReason) => {
    void tapLight();
    try {
      await duelsApi.close(studentId, d.id, reason);
      setCloseFor(null);
      await load();
      reloadFeeds(); // closed bout lands in the "unresolved" tab
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'No se pudo cerrar el duelo.');
    }
  };

  if (loading) return <CardSkeleton lines={3} />;

  const isParticipant = (d: Duel) => d.challengerId === studentId || d.opponentId === studentId;
  const incoming = duels.filter((d) => d.opponentId === studentId && d.status === 'PENDING');
  const outgoing = duels.filter((d) => d.challengerId === studentId && d.status === 'PENDING');
  const accepted = duels.filter((d) => d.status === 'ACCEPTED' && isParticipant(d));
  // Duels I must judge as the impartial referee (I'm not a participant).
  const toReferee = duels.filter((d) => d.status === 'ACCEPTED' && d.refereeId === studentId && !isParticipant(d));

  return (
    <div className="space-y-6">
      <button
        onClick={() => { void tapLight(); setChallengeOpen(true); }}
        className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-sm"
      >
        ⚔️ Retar a un compañero
      </button>

      {/* Incoming challenges */}
      {incoming.length > 0 && (
        <Card title="Te retaron">
          <div className="space-y-2">
            {incoming.map((d) => (
              <div key={d.id} className="p-3 rounded-lg border border-amber-200 bg-amber-50">
                <p className="text-sm text-gray-900">
                  <span className="font-semibold">{d.challengerName}</span> te retó
                  {formatLabel(d) && <span className="text-gray-500"> · {formatLabel(d)}</span>}
                </p>
                <ScheduleLine d={d} />
                {d.message && <p className="text-xs text-gray-500 italic mt-0.5">"{d.message}"</p>}
                <div className="flex gap-2 mt-2">
                  <button onClick={() => respond(d, true)} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 rounded-lg">Aceptar</button>
                  <button onClick={() => respond(d, false)} className="flex-1 bg-white border border-gray-300 text-gray-600 text-sm font-medium py-2 rounded-lg">Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Accepted — awaiting result */}
      {accepted.length > 0 && (
        <Card title="Duelos en juego">
          <div className="space-y-2">
            {accepted.map((d) => {
              const o = other(d, studentId);
              const refereed = d.refereeId != null;
              return (
                <div key={d.id} className="p-3 rounded-lg border border-primary-200 bg-primary-50">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">vs <span className="font-semibold">{o.name}</span>
                        {formatLabel(d) && <span className="text-gray-500"> · {formatLabel(d)}</span>}
                      </p>
                      <p className="text-xs text-gray-400">
                        {refereed
                          ? `Esperando el veredicto de ${d.refereeName} ⚖️`
                          : 'Aceptado · registra el resultado al terminar'}
                      </p>
                      <ScheduleLine d={d} />
                    </div>
                    {/* With a referee, participants can't self-report — only the judge decides. */}
                    {!refereed && (
                      <button onClick={() => setResultFor(d)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex-shrink-0">Resultado</button>
                    )}
                  </div>
                  {/* Escape hatch: if the bout won't happen, either fighter can close it off. */}
                  <button
                    onClick={() => { void tapLight(); setCloseFor(d); }}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-500 px-3 py-2 rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
                  >
                    🏳️ ¿No se hará? Cerrar duelo
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Duels I must judge as the impartial referee */}
      {toReferee.length > 0 && (
        <Card title="Eres árbitro ⚖️">
          <div className="space-y-2">
            {toReferee.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-amber-200 bg-amber-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">{d.challengerName}</span> vs <span className="font-semibold">{d.opponentName}</span>
                    {formatLabel(d) && <span className="text-gray-500"> · {formatLabel(d)}</span>}
                  </p>
                  <p className="text-xs text-gray-400">Tú das el veredicto al terminar</p>
                  <ScheduleLine d={d} />
                </div>
                <button onClick={() => setResultFor(d)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex-shrink-0">Veredicto</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Outgoing pending */}
      {outgoing.length > 0 && (
        <Card title="Esperando respuesta">
          <div className="space-y-2">
            {outgoing.map((d) => (
              <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">Retaste a <span className="font-semibold">{d.opponentName}</span> — pendiente</p>
                  <ScheduleLine d={d} />
                </div>
                <button onClick={() => cancel(d)} className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0">Cancelar</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Academy ranking (top 10 by record) */}
      <DuelRankingCard ranking={ranking} meId={studentId} onOpen={setCardFor} />

      {/* Academy feed — two keyset-paginated tabs (results / unresolved) with infinite scroll */}
      <Card title="Duelos de la academia">
        <div className="flex gap-2 mb-4">
          <FeedTab active={feedTab === 'results'} onClick={() => setFeedTab('results')}>
            🏆 Resultados <FeedCount feed={resultsFeed} />
          </FeedTab>
          <FeedTab active={feedTab === 'unresolved'} onClick={() => setFeedTab('unresolved')}>
            🏳️ Sin resolver <FeedCount feed={unresolvedFeed} />
          </FeedTab>
        </div>

        {/* key={feedTab} remounts the list on tab change so no rows from the other tab linger. */}
        <div key={feedTab}>
          {activeFeed.items.length === 0 && !activeFeed.loading ? (
            <p className="text-center text-gray-400 text-sm py-6">
              {feedTab === 'results'
                ? 'Aún no hay duelos resueltos. ¡Sé el primero en retar! ⚔️'
                : 'Sin duelos pendientes por aquí. Todo lo aceptado se peleó o sigue en juego. 👌'}
            </p>
          ) : (
            <FeedGroups items={activeFeed.items} onOpen={setDetailDuel} />
          )}

          <FeedMore feed={activeFeed} />
        </div>
      </Card>

      {challengeOpen && (
        <ChallengeModal
          classmates={classmates}
          onClose={() => setChallengeOpen(false)}
          onCreate={async (req) => {
            playDuelo(); // fire within the tap gesture, before the await (autoplay policy)
            await duelsApi.create(studentId, req);
            void notifySuccess();
            await load();
          }}
        />
      )}

      {resultFor && (
        <ResultModal
          duel={resultFor}
          me={studentId}
          onClose={() => setResultFor(null)}
          onSubmit={async (data) => {
            playDuelo(); // fire within the tap gesture, before the await (autoplay policy)
            await duelsApi.reportResult(studentId, resultFor.id, data);
            void notifySuccess();
            await load();
            reloadFeeds(); // result lands in the results tab
          }}
        />
      )}

      {closeFor && (
        <CloseDuelModal
          duel={closeFor}
          me={studentId}
          onClose={() => setCloseFor(null)}
          onPick={(reason) => closeDuel(closeFor, reason)}
        />
      )}

      {cardFor != null && (
        <StudentInfoModal viewerId={studentId} targetId={cardFor} onClose={() => setCardFor(null)} />
      )}

      {detailDuel && <DuelDetail d={detailDuel} onClose={() => setDetailDuel(null)} />}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-4 border-b border-gray-100"><h2 className="font-bold text-gray-900">{title}</h2></div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Expanded card for a picked classmate (rival/referee): photo, full name, age and belt image. */
function ClassmateCard({ c, accent, onClear, clearLabel }: {
  c: Classmate; accent: 'primary' | 'amber'; onClear: () => void; clearLabel: string;
}) {
  const ring = accent === 'amber' ? 'bg-amber-50 border-amber-200' : 'bg-primary-50 border-primary-200';
  const clear = accent === 'amber' ? 'text-amber-500 hover:text-amber-700' : 'text-primary-400 hover:text-primary-600';
  return (
    <div className={`rounded-xl border p-3 ${ring}`}>
      <div className="flex items-center gap-3">
        {c.photoUrl ? (
          <img src={c.photoUrl} alt="" className="w-14 h-14 rounded-full object-cover flex-shrink-0" />
        ) : (
          <span className="w-14 h-14 rounded-full bg-gray-200 text-gray-500 text-lg font-bold flex items-center justify-center flex-shrink-0">
            {c.name.trim().charAt(0).toUpperCase()}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-gray-900 truncate">{c.name}</p>
          {c.nickname && <p className="text-xs text-gray-500 italic truncate">"{c.nickname}"</p>}
          <p className="text-xs text-gray-500">
            {c.age != null ? `${c.age} años` : 'Edad no registrada'}{c.belt ? ` · ${c.belt}` : ''}
          </p>
        </div>
        <button onClick={onClear} className={`text-xs flex-shrink-0 ${clear}`}>{clearLabel}</button>
      </div>
      {c.belt && <div className="mt-2.5 w-32"><BeltImage belt={c.belt} stripes={c.stripes ?? 0} /></div>}
    </div>
  );
}

/** Renders the agreed date/place under a duel card, or nothing if neither was set. */
function ScheduleLine({ d }: { d: Duel }) {
  const s = formatSchedule(d.scheduledAt, d.location);
  return s ? <p className="text-xs text-gray-500 mt-0.5">{s}</p> : null;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** Top-10 academy duel ranking by record (W/L). Collapsed to 3; pins my row if I'm below. */
function DuelRankingCard({ ranking, meId, onOpen }: { ranking: DuelRankingEntry[]; meId: number; onOpen: (studentId: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  if (ranking.length < 2) return null; // a lone fighter isn't a ranking

  const visibleCount = expanded ? 10 : 3;
  const top = ranking.slice(0, visibleCount);
  const myIndex = ranking.findIndex((e) => e.studentId === meId);

  return (
    <div className="bg-white rounded-xl shadow-sm jjp-accent-bar">
      <div className="p-5 pl-6 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Ranking de duelos 🥋</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Top 10 de tu academia · <span className="text-green-600">victorias</span> / <span className="text-red-500">derrotas</span> / <span className="text-gray-500">empates</span>
        </p>
      </div>
      <div className="p-3">
        {top.map((e, i) => (
          <RankRow key={e.studentId} e={e} rank={i + 1} isMe={e.studentId === meId} onOpen={onOpen} />
        ))}
        {/* Pin my position at the bottom when I'm outside the visible rows. */}
        {myIndex >= visibleCount && (
          <div className="mt-1 pt-2 border-t border-dashed border-gray-200">
            <RankRow e={ranking[myIndex]} rank={myIndex + 1} isMe onOpen={onOpen} />
          </div>
        )}
        {ranking.length > 3 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full mt-1 py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          >
            {expanded ? 'Ver menos' : `Ver todo (${Math.min(ranking.length, 10)})`}
          </button>
        )}
      </div>
    </div>
  );
}

function RankRow({ e, rank, isMe, onOpen }: { e: DuelRankingEntry; rank: number; isMe: boolean; onOpen: (studentId: number) => void }) {
  return (
    <button onClick={() => onOpen(e.studentId)} className={`w-full text-left flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors ${isMe ? 'bg-primary-50' : ''}`}>
      <span className="w-7 text-center text-sm font-bold text-gray-500 flex-shrink-0">{MEDALS[rank - 1] ?? rank}</span>
      {e.photoUrl ? (
        <img src={e.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
      ) : (
        <span className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 text-xs font-bold flex items-center justify-center flex-shrink-0">
          {e.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className={`flex-1 min-w-0 truncate text-sm ${isMe ? 'font-bold text-primary-700' : 'text-gray-700'}`}>
        {e.name} {isMe && <span className="text-[10px] font-semibold text-primary-500">(tú)</span>}
      </span>
      <span className="flex-shrink-0 text-sm font-bold tabular-nums">
        <span className="text-green-600">{e.wins}</span>
        <span className="text-gray-300"> / </span>
        <span className="text-red-500">{e.losses}</span>
        <span className="text-gray-300"> / </span>
        <span className="text-gray-400">{e.draws}</span>
      </span>
    </button>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

/** "Diego Andrés Rivas Palma" → "Diego Rivas" (first + last word). */
function abbrev(name: string): string {
  const words = name.trim().split(/\s+/);
  return words.length <= 2 ? name : `${words[0]} ${words[words.length - 1]}`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split('-');
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  return `${parseInt(d)} ${months[parseInt(m) - 1]}`;
}

function groupByDate(duels: Duel[]): Array<{ date: string; items: Duel[] }> {
  const groups: Array<{ date: string; items: Duel[] }> = [];
  for (const d of duels) {
    const date = (d.completedAt ?? d.respondedAt ?? d.createdAt).slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.date === date) last.items.push(d);
    else groups.push({ date, items: [d] });
  }
  return groups;
}

/** True for a bout that never resolved: closed by a fighter (CANCELLED + reason) or swept (EXPIRED). */
function isUnresolved(d: Duel): boolean {
  return d.status === 'EXPIRED' || (d.status === 'CANCELLED' && d.closeReason != null);
}

/** Icon + reason text for an unresolved bout, by how it ended. */
function unresolvedMeta(d: Duel): { icon: string; label: string } {
  if (d.status === 'EXPIRED') return { icon: '⌛', label: 'Venció el plazo · nadie reportó' };
  if (d.closeReason === 'SCARED') return { icon: '😅', label: 'Cerrado · le dio miedo' };
  if (d.closeReason === 'POSTPONED') return { icon: '📅', label: 'Cerrado · se pospuso' };
  return { icon: '🏳️', label: 'Cancelado' };
}

/** Tab pill for the academy-feed switcher. */
function FeedTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 py-2 rounded-lg text-sm font-semibold border-2 transition-colors ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'}`}
    >
      {children}
    </button>
  );
}

/** Date-grouped list of tappable feed rows, shared by both tabs. */
function FeedGroups({ items, onOpen }: { items: Duel[]; onOpen: (d: Duel) => void }) {
  return (
    <div className="space-y-4">
      {groupByDate(items).map(({ date, items: rows }) => (
        <div key={date}>
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-2">{formatDate(date)}</p>
          <div className="space-y-1.5">
            {rows.map((d) => <FeedRow key={d.id} d={d} onOpen={() => onOpen(d)} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Loaded-count badge for a tab: "(12)" when fully loaded, "(20+)" while more pages remain. */
function FeedCount({ feed }: { feed: FeedState }) {
  if (feed.items.length === 0) return null;
  return <span className="opacity-60">({feed.items.length}{feed.hasMore ? '+' : ''})</span>;
}

/** Infinite-scroll trigger + "Cargar más" fallback for the active tab. */
function FeedMore({ feed }: { feed: FeedState }) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { loadMore, hasMore, loading } = feed;

  // Auto-load the next page when the sentinel scrolls into view (300px early for a smooth feel).
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) loadMore();
    }, { rootMargin: '300px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, hasMore]);

  if (!hasMore && !loading) return null;
  return (
    <div className="pt-3">
      <div ref={sentinelRef} className="h-px" />
      {loading ? (
        <div className="flex justify-center py-2">
          <div className="w-5 h-5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <button onClick={loadMore} className="w-full py-2 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors">
          Cargar más
        </button>
      )}
    </div>
  );
}

// ── compact feed row ─────────────────────────────────────────────────────────

function FeedRow({ d, onOpen }: { d: Duel; onOpen: () => void }) {
  // Unresolved bouts (closed / expired) read differently: no winner, just who-vs-who + reason.
  if (isUnresolved(d)) {
    const { icon, label } = unresolvedMeta(d);
    return (
      <button
        onClick={onOpen}
        className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 active:bg-gray-100 transition-colors"
      >
        <span className="text-base flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">{abbrev(d.challengerName)} vs {abbrev(d.opponentName)}</p>
          <p className="text-xs text-gray-400 truncate">{label}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-gray-400">{shortDate((d.completedAt ?? d.respondedAt ?? d.createdAt).slice(0, 10))}</span>
          <span className="text-gray-300 text-xs">›</span>
        </div>
      </button>
    );
  }

  const isRejected = d.status === 'REJECTED';
  const isDraw = !isRejected && d.winnerStudentId == null;
  const icon = isRejected ? '🚫' : isDraw ? '🤝' : '🏆';

  const mainLine = isRejected
    ? `${abbrev(d.opponentName)} rechazó a ${abbrev(d.challengerName)}`
    : isDraw
    ? `${abbrev(d.challengerName)} vs ${abbrev(d.opponentName)}`
    : `${abbrev(d.winnerName!)} vs ${abbrev(d.winnerStudentId === d.challengerId ? d.opponentName : d.challengerName)}`;

  const label = formatLabel(d);
  const subLine = !isRejected && d.method
    ? `${METHOD_LABEL[d.method]}${label ? ` · ${label}` : ''}`
    : label ?? null;

  return (
    <button
      onClick={onOpen}
      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 active:bg-gray-100 transition-colors"
    >
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{mainLine}</p>
        {subLine && <p className="text-xs text-gray-400 truncate">{subLine}</p>}
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-xs text-gray-400">{shortDate((d.completedAt ?? d.respondedAt ?? d.createdAt).slice(0, 10))}</span>
        <span className="text-gray-300 text-xs">›</span>
      </div>
    </button>
  );
}

// ── duel detail modal (same pattern as AchievementDetail) ───────────────────

function DuelDetail({ d, onClose }: { d: Duel; onClose: () => void }) {
  const unresolved = isUnresolved(d);
  const isRejected = d.status === 'REJECTED';
  const isDraw = !unresolved && !isRejected && d.winnerStudentId == null;
  const date = (d.completedAt ?? d.respondedAt ?? d.createdAt).slice(0, 10);
  const loserName = !unresolved && !isRejected && !isDraw && d.winnerStudentId != null
    ? (d.winnerStudentId === d.challengerId ? d.opponentName : d.challengerName)
    : null;
  const label = formatLabel(d);
  const methodDetail = d.method
    ? `${METHOD_LABEL[d.method]}${d.submissionName ? ` · ${d.submissionName}` : ''}${d.method === 'POINTS' && d.challengerScore != null ? ` (${d.challengerScore}–${d.opponentScore})` : ''}`
    : null;
  const unres = unresolved ? unresolvedMeta(d) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center jjp-pop">
        <button onClick={onClose} className="absolute right-3 top-3 text-2xl leading-none text-gray-300 hover:text-gray-500" aria-label="Cerrar">×</button>

        <div className="text-5xl mb-3">{unres ? unres.icon : isRejected ? '🚫' : isDraw ? '🤝' : '🏆'}</div>

        {unres ? (
          <>
            <p className="font-bold text-gray-900 text-base">{d.challengerName}</p>
            <p className="text-sm text-gray-500 my-1">vs</p>
            <p className="font-bold text-gray-900 text-base">{d.opponentName}</p>
            <p className="text-sm font-semibold text-gray-600 mt-3">{unres.label}</p>
          </>
        ) : isRejected ? (
          <p className="text-base text-gray-700 leading-snug">
            <span className="font-bold">{d.opponentName}</span> rechazó el reto de{' '}
            <span className="font-bold">{d.challengerName}</span>
          </p>
        ) : isDraw ? (
          <>
            <p className="font-bold text-gray-900 text-base">{d.challengerName}</p>
            <p className="text-sm text-gray-500 my-1">empató con</p>
            <p className="font-bold text-gray-900 text-base">{d.opponentName}</p>
          </>
        ) : (
          <>
            <p className="font-extrabold text-green-700 text-lg leading-snug">{d.winnerName}</p>
            <p className="text-sm text-gray-500 my-1">venció a</p>
            <p className="font-bold text-gray-800 text-base">{loserName}</p>
          </>
        )}

        {(methodDetail || label) && (
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {methodDetail && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 border border-orange-200 text-orange-700">{methodDetail}</span>
            )}
            {label && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 border border-gray-200 text-gray-600">{label}</span>
            )}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-4">{formatDate(date)}</p>

        {d.resultNotes && (
          <p className="text-sm text-gray-500 italic mt-3 pt-3 border-t border-gray-100">"{d.resultNotes}"</p>
        )}

        {d.refereeName && (
          <p className="text-xs text-gray-400 mt-2">🧑‍⚖️ Árbitro: {d.refereeName}</p>
        )}
      </div>
    </div>
  );
}

/** Quick reason picker shown when a fighter closes an accepted bout that won't be fought. */
function CloseDuelModal({ duel, me, onClose, onPick }: {
  duel: Duel;
  me: number;
  onClose: () => void;
  onPick: (reason: DuelCloseReason) => void;
}) {
  const o = other(duel, me);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-5">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl text-center jjp-pop">
        <button onClick={onClose} className="absolute right-3 top-3 text-2xl leading-none text-gray-300 hover:text-gray-500" aria-label="Cerrar">×</button>
        <div className="text-4xl mb-2">🏳️</div>
        <p className="text-base font-bold text-gray-900">Cerrar duelo vs {o.name}</p>
        <p className="text-sm text-gray-500 mt-1 mb-5">El duelo saldrá de "en juego" y no contará en el ranking.</p>
        <div className="space-y-2">
          <button
            onClick={() => onPick('SCARED')}
            className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-700 hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            😅 Me dio miedo
          </button>
          <button
            onClick={() => onPick('POSTPONED')}
            className="w-full py-3 rounded-xl text-sm font-semibold border-2 border-gray-200 text-gray-700 hover:border-primary-400 hover:bg-primary-50 transition-colors"
          >
            📅 Se pospuso
          </button>
        </div>
      </div>
    </div>
  );
}

function ChallengeModal({
  classmates, onClose, onCreate,
}: {
  classmates: Classmate[];
  onClose: () => void;
  onCreate: (req: { opponentStudentId: number; refereeStudentId?: number | null; format?: DuelFormat | null; modality?: TrainingModality | null; message?: string | null; scheduledAt?: string | null; location?: string | null }) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [opponent, setOpponent] = useState<Classmate | null>(null);
  const [refSearch, setRefSearch] = useState('');
  const [referee, setReferee] = useState<Classmate | null>(null);
  const [format, setFormat] = useState<DuelFormat | null>(null);
  const [modality, setModality] = useState<TrainingModality | null>(null);
  const [message, setMessage] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState('');
  const [saving, setSaving] = useState(false);

  const q = search.trim().toLowerCase();
  const matches = q ? classmates.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8) : [];

  // Referee must be a third person — exclude whoever is already picked as the rival.
  const rq = refSearch.trim().toLowerCase();
  const refMatches = rq
    ? classmates.filter((c) => c.id !== opponent?.id && c.name.toLowerCase().includes(rq)).slice(0, 8)
    : [];

  const submit = async () => {
    if (!opponent || !format || saving) return;
    setSaving(true);
    try {
      await onCreate({
        opponentStudentId: opponent.id,
        refereeStudentId: referee?.id ?? null,
        format,
        // Gi/No-Gi only matters for a submission bout.
        modality: format === 'SUBMISSION' ? modality : null,
        message: message.trim() || null,
        scheduledAt: scheduledAt || null,
        location: location.trim() || null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title="Retar a un compañero" onClose={onClose}>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Rival</p>
          {opponent ? (
            <ClassmateCard c={opponent} accent="primary" clearLabel="cambiar" onClear={() => setOpponent(null)} />
          ) : (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar compañero…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
              />
              {matches.length > 0 && (
                <div className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {matches.map((c) => (
                    <button key={c.id} onClick={() => { setOpponent(c); setSearch(''); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {c.name}{c.belt && <span className="text-xs text-gray-400"> · {c.belt}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Modo <span className="text-red-400">*</span></p>
          <div className="flex flex-wrap gap-2">
            {(['SUBMISSION', 'COMBAT_JJ', 'MMA', 'NO_RULES'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${format === f ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'}`}
              >
                {FORMAT_LABEL[f]}
              </button>
            ))}
          </div>
          {/* Gi/No-Gi only applies to a submission bout — nest it clearly under Sumisión. */}
          {format === 'SUBMISSION' && (
            <div className="mt-3 ml-1 pl-3 border-l-2 border-primary-300">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">¿Gi o No-Gi? (opcional)</p>
              <div className="flex gap-2">
                {(['GI', 'NOGI'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setModality(modality === m ? null : m)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${modality === m ? 'border-primary-500 bg-primary-600 text-white' : 'border-gray-300 bg-white text-gray-600'}`}
                  >
                    {MODALITY_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cuándo y dónde (opcional)</p>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value.slice(0, 120))}
            placeholder="Lugar — ej. Tatami 2, academia central"
            className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Árbitro (opcional)</p>
          {referee ? (
            <ClassmateCard c={referee} accent="amber" clearLabel="quitar" onClear={() => setReferee(null)} />
          ) : (
            <>
              <input
                value={refSearch}
                onChange={(e) => setRefSearch(e.target.value)}
                placeholder="Buscar árbitro…"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
              />
              {refMatches.length > 0 && (
                <div className="mt-2 border border-gray-100 rounded-lg divide-y divide-gray-100">
                  {refMatches.map((c) => (
                    <button key={c.id} onClick={() => { setReferee(c); setRefSearch(''); }} className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                      {c.name}{c.belt && <span className="text-xs text-gray-400"> · {c.belt}</span>}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          <p className="text-xs text-gray-400 mt-1.5">Si eliges árbitro, solo esa persona podrá publicar el resultado.</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Mensaje (opcional)</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Ej. ¡Te espero en el tatami! 🔥"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </div>
      <SheetFooter>
        <button onClick={submit} disabled={!opponent || !format || saving} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
          {saving ? 'Enviando…' : !opponent ? 'Elige un rival' : !format ? 'Elige un modo' : 'Enviar reto'}
        </button>
      </SheetFooter>
    </Sheet>
  );
}

function ResultModal({
  duel, me, onClose, onSubmit,
}: {
  duel: Duel;
  me: number;
  onClose: () => void;
  onSubmit: (data: { winnerStudentId?: number | null; method: DuelMethod; submissionName?: string | null; challengerScore?: number | null; opponentScore?: number | null; notes?: string | null }) => Promise<void>;
}) {
  // Pick the winner by participant so the same modal works whether the reporter is a
  // participant (their side reads "Gané yo") or the impartial referee (both read by name).
  const firstName = (n: string) => n.split(' ')[0] || n;
  const challengerLabel = duel.challengerId === me ? 'Gané yo' : `Ganó ${firstName(duel.challengerName)}`;
  const opponentLabel = duel.opponentId === me ? 'Gané yo' : `Ganó ${firstName(duel.opponentName)}`;
  const isReferee = duel.refereeId === me;
  const [outcome, setOutcome] = useState<'challenger' | 'opponent' | 'draw' | null>(null);
  const [method, setMethod] = useState<DuelMethod>('SUBMISSION');
  const [submissionName, setSubmissionName] = useState('');
  const [challengerScore, setChallengerScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const toScore = (v: string) => (v.trim() === '' ? null : Math.max(0, parseInt(v, 10) || 0));

  const submit = async () => {
    if (!outcome || saving) return;
    setSaving(true);
    try {
      if (outcome === 'draw') {
        await onSubmit({ winnerStudentId: null, method: 'DRAW', notes: notes.trim() || null });
      } else {
        const winnerStudentId = outcome === 'challenger' ? duel.challengerId : duel.opponentId;
        await onSubmit({
          winnerStudentId,
          method,
          submissionName: method === 'SUBMISSION' ? submissionName.trim() || null : null,
          challengerScore: method === 'POINTS' ? toScore(challengerScore) : null,
          opponentScore: method === 'POINTS' ? toScore(opponentScore) : null,
          notes: notes.trim() || null,
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet title={isReferee ? 'Veredicto del árbitro' : 'Resultado del duelo'} onClose={onClose}>
      <div className="p-5 space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">¿Cómo terminó?</p>
          <div className="grid grid-cols-3 gap-2">
            <OutcomeBtn active={outcome === 'challenger'} onClick={() => setOutcome('challenger')}>{challengerLabel}</OutcomeBtn>
            <OutcomeBtn active={outcome === 'opponent'} onClick={() => setOutcome('opponent')}>{opponentLabel}</OutcomeBtn>
            <OutcomeBtn active={outcome === 'draw'} onClick={() => setOutcome('draw')}>Empate</OutcomeBtn>
          </div>
        </div>

        {outcome && outcome !== 'draw' && (
          <>
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Método</p>
              <div className="flex flex-wrap gap-2">
                {(['SUBMISSION', 'POINTS', 'DECISION', 'DISQUALIFICATION'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${method === m ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {METHOD_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>

            {method === 'SUBMISSION' && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">¿Con qué sumisión?</p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SUBMISSION_CHIPS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setSubmissionName(s)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${submissionName === s ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <input
                  value={submissionName}
                  onChange={(e) => setSubmissionName(e.target.value)}
                  placeholder="Otra…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}

            {method === 'POINTS' && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Puntos de cada uno</p>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { name: duel.challengerName, value: challengerScore, set: setChallengerScore },
                    { name: duel.opponentName, value: opponentScore, set: setOpponentScore },
                  ] as const).map((f) => (
                    <div key={f.name}>
                      <label className="block text-xs text-gray-500 mb-1 truncate">{firstName(f.name)}</label>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder="0"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Notas (opcional)</p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value.slice(0, 200))}
            rows={2}
            placeholder="Ej. gran lucha, fue parejo"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none"
          />
        </div>
      </div>
      <SheetFooter>
        <button onClick={submit} disabled={!outcome || saving} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
          {saving ? 'Guardando…' : 'Publicar resultado'}
        </button>
      </SheetFooter>
    </Sheet>
  );
}

function OutcomeBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${active ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'}`}
    >
      {children}
    </button>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-gray-50 rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto pb-safe shadow-2xl">
        <div className="sticky top-0 bg-gray-50/95 backdrop-blur px-5 pt-4 pb-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function SheetFooter({ children }: { children: React.ReactNode }) {
  return <div className="sticky bottom-0 bg-gray-50/95 backdrop-blur px-5 py-3 border-t border-gray-200">{children}</div>;
}
