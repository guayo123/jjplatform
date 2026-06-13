import { useState } from 'react';
import type { TechniqueCurriculum, TechniqueBeltGroup, Technique } from '../../../types';
import { tapLight, notifySuccess } from '../../../native/haptics';
import { Spinner } from './shared';

interface Props {
  curriculum: TechniqueCurriculum[];
  loading: boolean;
  /** Toggle a technique's learned state (optimistic update handled by the parent). */
  onToggle: (techniqueId: number, learned: boolean) => void;
}

/**
 * "Programa técnico" — the academy's per-belt curriculum for the disciplines the student
 * trains. Each belt is an accordion of techniques the student can tick off; a progress bar
 * tracks how much of the program they've learned. Belts above their current rank are shown
 * as a preview of what's coming.
 */
export default function CurriculumCard({ curriculum, loading, onToggle }: Props) {
  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Programa técnico</h2>
        <p className="text-xs text-gray-400 mt-0.5">Marca lo que ya dominas y sigue tu avance por cinturón</p>
      </div>
      <div className="p-5 space-y-6">
        {loading ? (
          <Spinner />
        ) : curriculum.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm text-gray-500 font-medium">Aún no hay programa técnico</p>
            <p className="text-xs text-gray-400 mt-1">Tu academia todavía no ha publicado las técnicas de tu disciplina.</p>
          </div>
        ) : (
          curriculum.map((c) => <DisciplineCurriculum key={c.disciplineId} c={c} onToggle={onToggle} />)
        )}
      </div>
    </div>
  );
}

function DisciplineCurriculum({ c, onToggle }: { c: TechniqueCurriculum; onToggle: Props['onToggle'] }) {
  const pct = c.totalCount > 0 ? Math.round((c.learnedCount / c.totalCount) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-semibold text-gray-900 text-sm">{c.disciplineName}</span>
        {c.ageCategoryName && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{c.ageCategoryName}</span>
        )}
        <span className="text-xs text-gray-400 ml-auto">{c.learnedCount}/{c.totalCount} técnicas</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="space-y-2">
        {c.belts.map((g) => (
          <BeltAccordion key={g.beltId} group={g} onToggle={onToggle} />
        ))}
      </div>
    </div>
  );
}

function BeltAccordion({ group, onToggle }: { group: TechniqueBeltGroup; onToggle: Props['onToggle'] }) {
  // Open the student's current belt by default; others stay collapsed.
  const [open, setOpen] = useState(group.current);
  const complete = group.totalCount > 0 && group.learnedCount === group.totalCount;

  return (
    <div className={`border rounded-xl overflow-hidden ${group.current ? 'border-primary-300' : 'border-gray-200'}`}>
      <button
        onClick={() => { void tapLight(); setOpen((v) => !v); }}
        className={`w-full flex items-center gap-3 p-3 text-left transition-colors ${group.current ? 'bg-primary-50' : 'bg-white hover:bg-gray-50'} ${!group.reached ? 'opacity-70' : ''}`}
      >
        <span
          className="h-6 w-2 rounded-full flex-shrink-0 border border-black/10"
          style={{ background: group.beltColorHex ?? '#9CA3AF' }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-900">{group.beltName}</span>
            {group.current && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded">Actual</span>
            )}
            {!group.reached && (
              <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Próximo</span>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium flex-shrink-0 ${complete ? 'text-green-600' : 'text-gray-400'}`}>
          {complete ? '✓ ' : ''}{group.learnedCount}/{group.totalCount}
        </span>
        <span className={`text-gray-400 text-xs flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {group.techniques.map((t) => (
            <TechniqueRow key={t.id} t={t} onToggle={onToggle} />
          ))}
        </div>
      )}
    </div>
  );
}

function TechniqueRow({ t, onToggle }: { t: Technique; onToggle: Props['onToggle'] }) {
  const learned = !!t.learned;
  const handle = () => {
    void tapLight();
    if (!learned) void notifySuccess();
    onToggle(t.id, !learned);
  };
  return (
    <div className="flex items-start gap-3 p-3">
      <button
        onClick={handle}
        aria-pressed={learned}
        aria-label={learned ? 'Marcar como no aprendida' : 'Marcar como aprendida'}
        className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
          learned ? 'bg-primary-600 border-primary-600 text-white' : 'border-gray-300 text-transparent hover:border-primary-400'
        }`}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7.5 7.5a1 1 0 01-1.4 0L3.3 9.7a1 1 0 011.4-1.4l3.3 3.3 6.8-6.8a1 1 0 011.4 0z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${learned ? 'text-gray-900' : 'text-gray-700'}`}>{t.name}</span>
          {t.position && (
            <span className="text-[10px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded-full">{t.position}</span>
          )}
        </div>
        {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
        {t.videoUrl && (
          <a
            href={t.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            <span>▶</span> Ver video
          </a>
        )}
      </div>
    </div>
  );
}
