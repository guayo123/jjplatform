import { create } from 'zustand';
import { studentsApi } from '../api/students';
import type { Student, StudentForm } from '../types';

interface StudentState {
  students: Student[];
  loading: boolean;
  error: string | null;
  fetchStudents: () => Promise<void>;
  createStudent: (data: StudentForm) => Promise<void>;
  updateStudent: (id: number, data: StudentForm) => Promise<void>;
  deleteStudent: (id: number) => Promise<void>;
}

export const useStudentStore = create<StudentState>((set) => ({
  students: [],
  loading: false,
  error: null,

  fetchStudents: async () => {
    set({ loading: true, error: null });
    try {
      const students = await studentsApi.list();
      set({ students, loading: false });
    } catch {
      set({ error: 'Failed to load students', loading: false });
    }
  },

  createStudent: async (data) => {
    const student = await studentsApi.create(data);
    set((state) => ({ students: [...state.students, student] }));
  },

  updateStudent: async (id, data) => {
    const updated = await studentsApi.update(id, data);
    set((state) => ({
      students: state.students.map((s) => (s.id === id ? updated : s)),
    }));
  },

  deleteStudent: async (id) => {
    await studentsApi.delete(id);
    set((state) => ({
      students: state.students.filter((s) => s.id !== id),
    }));
  },
}));
