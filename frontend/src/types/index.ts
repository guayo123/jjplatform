// ─── Auth ───
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  academyName: string;
  description?: string;
  address?: string;
  phone?: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  academyId: number;
  academyName: string;
  role: string;
}

// ─── User (staff) ───
export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'ENCARGADO' | 'PROFESOR';

export interface AppUser {
  id: number;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: 'PROFESOR' | 'ENCARGADO';
}

// ─── Super Admin ───
export interface AcademySummary {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  adminEmail: string;
  studentCount: number;
  active: boolean;
  createdAt: string;
}

// ─── Student ───
export interface Student {
  id: number;
  name: string;
  age: number | null;
  photoUrl: string | null;
  address: string | null;
  medicalNotes: string | null;
  active: boolean;
}

export type StudentForm = Omit<Student, 'id'>;

// ─── Payment ───
export interface Payment {
  id: number;
  studentId: number;
  studentName: string;
  amount: number;
  month: number;
  year: number;
  notes: string | null;
  paidAt: string | null;
}

export interface PaymentForm {
  studentId: number;
  amount: number;
  month: number;
  year: number;
  notes?: string;
}

// ─── Tournament ───
export interface Tournament {
  id: number;
  name: string;
  description: string | null;
  date: string;
  maxParticipants: number | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  participants: Participant[];
  matches: BracketMatch[];
}

export interface Participant {
  id: number;
  studentId: number;
  studentName: string;
  seed: number;
}

export interface BracketMatch {
  id: number;
  round: number;
  matchNumber: number;
  participant1: Participant | null;
  participant2: Participant | null;
  winnerId: number | null;
}

// ─── Academy (Public) ───
export interface AcademyPublic {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  schedules: Schedule[];
  photos: Photo[];
  tournaments: TournamentSummary[];
}

export interface Schedule {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  className: string;
}

export interface Photo {
  id: number;
  url: string;
  caption: string | null;
}

export interface TournamentSummary {
  id: number;
  name: string;
  date: string;
  status: string;
  participantCount: number;
}
