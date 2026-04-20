import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tournamentsApi } from '../../api/tournaments';
import { useStudentStore } from '../../stores/studentStore';
import BracketView from '../../components/BracketView';
import type { Tournament } from '../../types';

const statusLabel = (s: string) =>
  s === 'OPEN' ? 'Abierto' : s === 'IN_PROGRESS' ? 'En curso' : 'Finalizado';

const statusColor = (s: string) =>
  s === 'OPEN'
    ? 'bg-green-100 text-green-700'
    : s === 'IN_PROGRESS'
    ? 'bg-yellow-100 text-yellow-700'
    : 'bg-gray-100 text-gray-600';

export default function TournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState(0);
  const { students, fetchStudents } = useStudentStore();

  useEffect(() => {
    fetchStudents();
    if (id) {
      tournamentsApi.get(Number(id)).then(setTournament).finally(() => setLoading(false));
    }
  }, [id, fetchStudents]);

  const addParticipant = async () => {
    if (!id || !selectedStudent) return;
    const updated = await tournamentsApi.addParticipant(Number(id), selectedStudent);
    setTournament(updated);
    setSelectedStudent(0);
  };

  const removeParticipant = async (participantId: number) => {
    if (!id) return;
    const updated = await tournamentsApi.removeParticipant(Number(id), participantId);
    setTournament(updated);
  };

  const generateBracket = async () => {
    if (!id) return;
    const updated = await tournamentsApi.generateBracket(Number(id));
    setTournament(updated);
  };

  const recordResult = async (matchId: number, winnerId: number, resultType: string) => {
    if (!id) return;
    const updated = await tournamentsApi.recordResult(Number(id), matchId, winnerId, resultType);
    setTournament(updated);
  };

  if (loading) return <p className="text-gray-400">Cargando...</p>;
  if (!tournament) return <p>Torneo no encontrado</p>;

  const participantIds = new Set(tournament.participants.map((p) => p.studentId));

  const availableStudents = students.filter(
    (s) => s.active && !participantIds.has(s.id)
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{tournament.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor(tournament.status)}`}>
              {statusLabel(tournament.status)}
            </span>
            {tournament.tipo === 'ABSOLUTO' && (
              <span className="text-xs px-2 py-1 rounded-full font-medium bg-purple-100 text-purple-700">
                Absoluto
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">{tournament.date}</p>
          {tournament.description && (
            <p className="text-gray-400 text-sm mt-1">{tournament.description}</p>
          )}
        </div>
        {tournament.status === 'OPEN' && tournament.participants.length >= 2 && (
          <button
            onClick={generateBracket}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Generar Bracket
          </button>
        )}
      </div>

      {/* Banner campeón */}
      {tournament.status === 'COMPLETED' && tournament.championName && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 mb-6 flex items-center gap-4">
          <span className="text-4xl">🏆</span>
          <div>
            <p className="text-sm text-yellow-700 font-medium">Campeón del torneo</p>
            <p className="text-xl font-bold text-yellow-900">{tournament.championName}</p>
          </div>
        </div>
      )}

      {/* Agregar participante */}
      {tournament.status === 'OPEN' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-3">Agregar participante</h2>

          {/* Info tipo/restricciones */}
          {tournament.tipo === 'ABSOLUTO' ? (
            <div className="mb-3 flex items-center gap-2 text-sm text-purple-700 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2">
              <span className="font-medium">Torneo Absoluto</span>
              <span className="text-purple-400">·</span>
              <span>Todos los participantes en una sola llave</span>
            </div>
          ) : (
            <div className="mb-3 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <span>Al generar el bracket, los participantes se agruparán por categoría de edad, cinturón y peso</span>
            </div>
          )}

          <div className="flex gap-3">
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            >
              <option value={0}>Seleccionar alumno...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.belt ? ` · ${s.belt}` : ''}{s.weight != null ? ` · ${s.weight}kg` : ''}
                </option>
              ))}
            </select>
            <button
              onClick={addParticipant}
              disabled={!selectedStudent}
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Agregar
            </button>
          </div>
          {availableStudents.length === 0 && (
            <p className="mt-2 text-xs text-gray-400">No hay alumnos disponibles para agregar.</p>
          )}
        </div>
      )}

      {/* Participantes */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold mb-3">
          Participantes ({tournament.participants.length}
          {tournament.maxParticipants ? ` / ${tournament.maxParticipants}` : ''})
        </h2>
        {tournament.participants.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay participantes aún</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tournament.participants.map((p) => (
              <div
                key={p.id}
                className="flex items-start gap-1 bg-primary-50 border border-primary-100 pl-3 pr-1 py-1.5 rounded-lg text-sm"
              >
                <div>
                  <span className="font-medium text-primary-800">#{p.seed} {p.studentName}</span>
                  <div className="flex gap-1 mt-0.5 flex-wrap">
                    {p.belt && (
                      <span className="text-xs text-gray-500">{p.belt}</span>
                    )}
                    {p.ageCategory && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                        {p.ageCategory}
                      </span>
                    )}
                    {p.weightCategory && (
                      <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                        {p.weightCategory}
                      </span>
                    )}
                  </div>
                </div>
                {tournament.status === 'OPEN' && (
                  <button
                    onClick={() => removeParticipant(p.id)}
                    className="ml-1 text-primary-400 hover:text-red-500 transition-colors rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-50 flex-shrink-0"
                    title="Quitar del torneo"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bracket */}
      {tournament.matches.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="font-semibold mb-4">Bracket</h2>
          <BracketView
            matches={tournament.matches}
            onRecordResult={tournament.status === 'IN_PROGRESS' ? recordResult : undefined}
          />
        </div>
      )}
    </div>
  );
}
