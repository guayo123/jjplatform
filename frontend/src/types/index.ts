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
  active: boolean;
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
  rut: string | null;
  email: string | null;
  phone: string | null;
  joinDate: string | null;
  age: number | null;
  weight: number | null;
  belt: string | null;
  stripes: number | null;
  photoUrl: string | null;
  address: string | null;
  medicalNotes: string | null;
  active: boolean;
}

export type PromotionType = 'PROMOCION' | 'DEGRADACION' | 'GRADO';

export interface BeltPromotion {
  id: number;
  studentId: number;
  studentName: string;
  studentPhotoUrl: string | null;
  type: PromotionType;
  fromBelt: string | null;
  fromStripes: number | null;
  toBelt: string;
  toStripes: number;
  promotionDate: string;
  notes: string | null;
  performedBy: string | null;
  deletable: boolean;
}

export interface BeltPromotionForm {
  studentId: number;
  fromBelt: string | null;
  fromStripes: number;
  toBelt: string;
  toStripes: number;
  promotionDate: string;
  notes: string | null;
}

export type StudentForm = Omit<Student, 'id' | 'stripes'>;

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
  tipo: 'CATEGORIAS' | 'ABSOLUTO';
  cinturonesFiltro: string | null;
  categoriasPesoFiltro: string | null;
  categoriaEdadFiltro: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED';
  participants: Participant[];
  matches: BracketMatch[];
  championStudentId: number | null;
  championName: string | null;
}

export interface Participant {
  id: number;
  studentId: number;
  studentName: string;
  seed: number;
  belt: string | null;
  ageCategory: string | null;
  weightCategory: string | null;
}

export interface BracketMatch {
  id: number;
  round: number;
  matchNumber: number;
  categoryGroup: string | null;
  participant1: Participant | null;
  participant2: Participant | null;
  winnerId: number | null;
  resultType: string | null;
}

// ─── Academy (Public) ───
export interface AcademyPublic {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  logoUrl: string | null;
  whatsapp: string | null;
  instagram: string | null;
  schedules: Schedule[];
  photos: Photo[];
  tournaments: TournamentSummary[];
  plans: Plan[];
  recentPromotions: RecentPromotion[];
}

export interface RecentPromotion {
  studentName: string;
  studentPhotoUrl: string | null;
  fromBelt: string | null;
  toBelt: string;
  promotionDate: string;
}

export interface Schedule {
  id: number;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  className: string;
}

export interface ScheduleForm {
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

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  features: string;
  active: boolean;
  displayOrder: number;
}

export interface PlanForm {
  name: string;
  description: string;
  price: number;
  features: string;
  displayOrder: number;
}

// ─── Academy Settings ───
export interface AcademySettings {
  id: number;
  name: string;
  description: string;
  address: string;
  whatsapp: string;
  instagram: string;
  logoUrl: string | null;
}
