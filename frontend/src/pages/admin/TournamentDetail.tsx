import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { tournamentsApi } from '../../api/tournaments';
import { useStudentStore } from '../../stores/studentStore';
import BracketView from '../../components/BracketView';
import type { Tournament } from '../../types';

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

  const generateBracket = async () => {
    if (!id) return;
    const updated = await tournamentsApi.generateBracket(Number(id));
    setTournament(updated);
  };

  const recordResult = async (matchId: number, winnerId: number) => {
    if (!id) return;
    const updated = await tournamentsApi.recordResult(Number(id), matchId, winnerId);
    setTournament(updated);
  };

  if (loading) return <p className="text-gray-400">Cargando...</p>;
  if (!tournament) return <p>Torneo no encontrado</p>;

  const participantIds = new Set(tournament.participants.map((p) => p.studentId));
  const availableStudents = students.filter((s) => !participantIds.has(s.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{tournament.name}</h1>
          <p className="text-gray-500 text-sm">{tournament.date}</p>
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

      {/* Add participant */}
      {tournament.status === 'OPEN' && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="font-semibold mb-3">Agregar participante</h2>
          <div className="flex gap-3">
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(Number(e.target.value))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1"
            >
              <option value={0}>Seleccionar alumno...</option>
              {availableStudents.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
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
        </div>
      )}

      {/* Participants */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="font-semibold mb-3">
          Participantes ({tournament.participants.length})
        </h2>
        {tournament.participants.length === 0 ? (
          <p className="text-gray-400 text-sm">No hay participantes aún</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tournament.participants.map((p) => (
              <span
                key={p.id}
                className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium"
              >
                #{p.seed} {p.studentName}
              </span>
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
