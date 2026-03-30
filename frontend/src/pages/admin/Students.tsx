import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useStudentStore } from '../../stores/studentStore';
import { useAuthStore } from '../../stores/authStore';
import type { Student } from '../../types';

export default function Students() {
  const { students, loading, fetchStudents, updateStudent } = useStudentStore();
  const { role } = useAuthStore();
  const canEdit = role === 'ADMIN' || role === 'ENCARGADO';

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleToggleActive = async (student: Student) => {
    await updateStudent(student.id, {
      name: student.name,
      age: student.age,
      photoUrl: student.photoUrl,
      address: student.address,
      medicalNotes: student.medicalNotes,
      active: !student.active,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Alumnos</h1>
        {canEdit && (
          <Link
            to="/admin/students/new"
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            + Nuevo alumno
          </Link>
        )}
      </div>

      {loading ? (
        <p className="text-gray-400">Cargando...</p>
      ) : students.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <p className="text-gray-500">No hay alumnos registrados</p>
          <Link to="/admin/students/new" className="text-primary-600 text-sm mt-2 inline-block">
            Agregar primer alumno
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Edad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {student.name.charAt(0)}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{student.age ?? '—'}</td>
                  <td className="px-6 py-4">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggleActive(student)}
                        title={student.active ? 'Desactivar' : 'Activar'}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          student.active ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                          student.active ? 'translate-x-5' : 'translate-x-1'
                        }`} />
                      </button>
                    ) : (
                      <span className={`inline-block h-2 w-2 rounded-full ${
                        student.active ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                    <span className={`ml-2 text-xs font-medium ${
                      student.active ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {student.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {canEdit && (
                      <Link
                        to={`/admin/students/${student.id}/edit`}
                        className="text-primary-600 hover:text-primary-800 text-sm"
                      >
                        Editar
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
