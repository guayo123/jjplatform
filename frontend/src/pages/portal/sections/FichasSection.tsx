import type { StudentDiscipline, BeltPromotion, TechniqueCurriculum } from '../../../types';
import BeltImage from '../../../components/BeltImage';
import { formatDate, BeltBadge, SkeletonRows, TYPE_CONFIG } from './shared';
import CurriculumCard from './CurriculumCard';

interface Props {
  disciplines: StudentDiscipline[];
  promotions: BeltPromotion[];
  detailLoading: boolean;
  expandedDisc: number | null;
  setExpandedDisc: (id: number | null) => void;
  curriculum: TechniqueCurriculum[];
  onToggleTechnique: (techniqueId: number, learned: boolean) => void;
}

/** "Fichas técnicas" — per-discipline belt/grade history, competition results & technique program. */
export default function FichasSection({ disciplines, promotions, detailLoading, expandedDisc, setExpandedDisc, curriculum, onToggleTechnique }: Props) {
  return (
    <div className="space-y-6">
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-5 border-b border-gray-100">
        <h2 className="font-bold text-gray-900">Fichas técnicas</h2>
        <p className="text-xs text-gray-400 mt-0.5">{disciplines.length} disciplina{disciplines.length !== 1 ? 's' : ''}</p>
      </div>
      <div className="p-5 space-y-4">
        {detailLoading ? (
          <SkeletonRows rows={4} />
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
                            const beltChange = promo.fromBelt && promo.fromBelt !== promo.toBelt;
                            return (
                              <div key={promo.id} className="bg-white rounded-lg p-3 border border-gray-100">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-base flex-shrink-0">{tc.icon}</span>
                                  <span className={`text-xs font-semibold ${tc.color}`}>{tc.label}</span>
                                  {beltChange && (
                                    <span className="text-xs text-gray-400">desde {promo.fromBelt}</span>
                                  )}
                                  <span className="text-xs text-gray-400 ml-auto">{formatDate(promo.promotionDate)}</span>
                                </div>
                                {/* Resulting belt with its degrees attached, like the promotion celebration */}
                                <div className="mt-2">
                                  <BeltImage belt={promo.toBelt} stripes={promo.toStripes} className="max-w-[220px]" />
                                </div>
                                {promo.notes && <p className="text-xs text-gray-400 italic mt-1.5">"{promo.notes}"</p>}
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

    <CurriculumCard curriculum={curriculum} loading={detailLoading} onToggle={onToggleTechnique} />
    </div>
  );
}
