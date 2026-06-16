import { useCallback, useEffect, useState } from 'react';
import type { Classmate, Duel, DuelMethod, TrainingModality } from '../../../types';
import { duelsApi } from '../../../api/duels';
import { trainingApi } from '../../../api/training';
import { useToast } from '../../../components/ToastContext';
import { notifyNow } from '../../../native/notifications';
import { tapLight, notifySuccess } from '../../../native/haptics';
import { formatDate, CardSkeleton } from './shared';

interface Props {
  studentId: number;
}

const MODALITY_LABEL: Record<string, string> = { GI: 'Gi', NOGI: 'No-Gi' };
const METHOD_LABEL: Record<DuelMethod, string> = {
  SUBMISSION: 'Sumisión',
  POINTS: 'Puntos',
  DECISION: 'Decisión',
  DRAW: 'Empate',
};
const SUBMISSION_CHIPS = ['Mataleón', 'Llave de brazo', 'Triángulo', 'Kimura', 'Guillotina', 'Americana'];

function other(d: Duel, me: number) {
  return d.challengerId === me
    ? { id: d.opponentId, name: d.opponentName, photo: d.opponentPhotoUrl }
    : { id: d.challengerId, name: d.challengerName, photo: d.challengerPhotoUrl };
}

/** "Retos" — challenge classmates, respond, report results, and see the academy feed. */
export default function DuelsSection({ studentId }: Props) {
  const { toast } = useToast();
  const [duels, setDuels] = useState<Duel[]>([]);
  const [feed, setFeed] = useState<Duel[]>([]);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [loading, setLoading] = useState(true);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const [resultFor, setResultFor] = useState<Duel | null>(null);

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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, fed, mates] = await Promise.all([
        duelsApi.mine(studentId),
        duelsApi.feed(studentId),
        trainingApi.classmates(studentId).catch(() => [] as Classmate[]),
      ]);
      setDuels(mine);
      setFeed(fed);
      setClassmates(mates);
      notifyChanges(mine);
    } catch {
      setDuels([]);
      setFeed([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, notifyChanges]);

  useEffect(() => { void load(); }, [load]);

  const respond = async (d: Duel, accept: boolean) => {
    void tapLight();
    try {
      await duelsApi.respond(studentId, d.id, accept);
      if (accept) void notifySuccess();
      await load();
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
                  {d.modality && <span className="text-gray-500"> · {MODALITY_LABEL[d.modality]}</span>}
                </p>
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
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-primary-200 bg-primary-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">vs <span className="font-semibold">{o.name}</span>
                      {d.modality && <span className="text-gray-500"> · {MODALITY_LABEL[d.modality]}</span>}
                    </p>
                    <p className="text-xs text-gray-400">
                      {refereed
                        ? `Esperando el veredicto de ${d.refereeName} ⚖️`
                        : 'Aceptado · registra el resultado al terminar'}
                    </p>
                  </div>
                  {/* With a referee, participants can't self-report — only the judge decides. */}
                  {!refereed && (
                    <button onClick={() => setResultFor(d)} className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-3 py-2 rounded-lg flex-shrink-0">Resultado</button>
                  )}
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
                    {d.modality && <span className="text-gray-500"> · {MODALITY_LABEL[d.modality]}</span>}
                  </p>
                  <p className="text-xs text-gray-400">Tú das el veredicto al terminar</p>
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
                <p className="flex-1 text-sm text-gray-700">Retaste a <span className="font-semibold">{d.opponentName}</span> — pendiente</p>
                <button onClick={() => cancel(d)} className="text-xs text-gray-400 hover:text-red-500 flex-shrink-0">Cancelar</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Academy feed */}
      <Card title="Resultados de la academia">
        {feed.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-6">Aún no hay duelos resueltos. ¡Sé el primero en retar! ⚔️</p>
        ) : (
          <div className="space-y-2">
            {feed.map((d) => <FeedRow key={d.id} d={d} />)}
          </div>
        )}
      </Card>

      {challengeOpen && (
        <ChallengeModal
          classmates={classmates}
          onClose={() => setChallengeOpen(false)}
          onCreate={async (req) => {
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
            await duelsApi.reportResult(studentId, resultFor.id, data);
            void notifySuccess();
            await load();
          }}
        />
      )}
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

function FeedRow({ d }: { d: Duel }) {
  if (d.status === 'REJECTED') {
    return (
      <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
        <span className="text-base mt-0.5">🚫</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{d.opponentName}</span> rechazó el reto de{' '}
            <span className="font-semibold">{d.challengerName}</span>
          </p>
          <p className="text-xs text-gray-400">{formatDate((d.respondedAt ?? d.createdAt).slice(0, 10))}</p>
        </div>
      </div>
    );
  }
  // COMPLETED
  const draw = d.winnerStudentId == null;
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
      <span className="text-base mt-0.5">{draw ? '🤝' : '🏆'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">
          {draw ? (
            <><span className="font-semibold">{d.challengerName}</span> vs <span className="font-semibold">{d.opponentName}</span> — empate</>
          ) : (
            <><span className="font-semibold text-green-700">{d.winnerName}</span> venció a{' '}
              <span className="font-semibold">{d.winnerStudentId === d.challengerId ? d.opponentName : d.challengerName}</span></>
          )}
        </p>
        <div className="flex flex-wrap gap-x-2 mt-0.5 text-xs text-gray-400">
          {d.method && <span>{METHOD_LABEL[d.method]}{d.method === 'SUBMISSION' && d.submissionName ? ` · ${d.submissionName}` : ''}</span>}
          {d.modality && <span>· {MODALITY_LABEL[d.modality]}</span>}
          <span>· {formatDate((d.completedAt ?? d.createdAt).slice(0, 10))}</span>
        </div>
        {d.resultNotes && <p className="text-xs text-gray-400 italic mt-0.5">"{d.resultNotes}"</p>}
      </div>
    </div>
  );
}

function ChallengeModal({
  classmates, onClose, onCreate,
}: {
  classmates: Classmate[];
  onClose: () => void;
  onCreate: (req: { opponentStudentId: number; refereeStudentId?: number | null; modality?: TrainingModality | null; message?: string | null }) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [opponent, setOpponent] = useState<Classmate | null>(null);
  const [refSearch, setRefSearch] = useState('');
  const [referee, setReferee] = useState<Classmate | null>(null);
  const [modality, setModality] = useState<TrainingModality | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const q = search.trim().toLowerCase();
  const matches = q ? classmates.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 8) : [];

  // Referee must be a third person — exclude whoever is already picked as the rival.
  const rq = refSearch.trim().toLowerCase();
  const refMatches = rq
    ? classmates.filter((c) => c.id !== opponent?.id && c.name.toLowerCase().includes(rq)).slice(0, 8)
    : [];

  const submit = async () => {
    if (!opponent || saving) return;
    setSaving(true);
    try {
      await onCreate({
        opponentStudentId: opponent.id,
        refereeStudentId: referee?.id ?? null,
        modality,
        message: message.trim() || null,
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
            <div className="flex items-center justify-between bg-primary-50 border border-primary-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-primary-700">{opponent.name}{opponent.belt ? ` · ${opponent.belt}` : ''}</span>
              <button onClick={() => setOpponent(null)} className="text-primary-400 hover:text-primary-600">cambiar</button>
            </div>
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
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Modalidad (opcional)</p>
          <div className="flex gap-2">
            {(['GI', 'NOGI'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModality(modality === m ? null : m)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${modality === m ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-gray-200 text-gray-500'}`}
              >
                {MODALITY_LABEL[m]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Árbitro (opcional)</p>
          {referee ? (
            <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <span className="text-sm font-medium text-amber-700">⚖️ {referee.name}{referee.belt ? ` · ${referee.belt}` : ''}</span>
              <button onClick={() => setReferee(null)} className="text-amber-500 hover:text-amber-700">quitar</button>
            </div>
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
        <button onClick={submit} disabled={!opponent || saving} className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50">
          {saving ? 'Enviando…' : 'Enviar reto'}
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
  onSubmit: (data: { winnerStudentId?: number | null; method: DuelMethod; submissionName?: string | null; notes?: string | null }) => Promise<void>;
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
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

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
                {(['SUBMISSION', 'POINTS', 'DECISION'] as const).map((m) => (
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
