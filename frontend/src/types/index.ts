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

export interface StudentRegisterRequest {
  rut: string;
  email: string;
}

export interface ForgotPasswordRequest {
  rut: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  academyId: number;
  academyName: string;
  role: string;
  mustChangePassword: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ─── User (staff) ───
export type UserRole = 'ADMIN' | 'SUPER_ADMIN' | 'ENCARGADO' | 'PROFESOR' | 'STUDENT';

export interface AppUser {
  id: number;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  role: 'ENCARGADO';
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
export interface StudentDisciplineBelt {
  disciplineId: number;
  disciplineName: string;
  belt: string;
  stripes: number;
  beltColorHex: string | null;
}

export interface Student {
  id: number;
  academyId?: number;
  academyName?: string;
  name: string;
  nickname: string | null;
  rut: string | null;
  email: string | null;
  phone: string | null;
  emergencyPhone: string | null;
  joinDate: string | null;
  birthDate: string | null;
  age: number | null;
  weight: number | null;
  belt: string | null;
  stripes: number | null;
  photoUrl: string | null;
  address: string | null;
  medicalNotes: string | null;
  bloodType: string | null;
  healthInsuranceType: string | null;
  healthInsuranceCompany: string | null;
  active: boolean;
  planIds?: number[];
  enrolledPlans?: Array<{ id: number; name: string; disciplineName: string | null; price: number | null; professorId: number | null; professorName: string | null }>;
  disciplineBelts?: StudentDisciplineBelt[];
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
  deleted: boolean;
  deletedBy: string | null;
  deletedReason: string | null;
  deletedAt: string | null;
  studentDisciplineId: number | null;
  disciplineName: string | null;
}

export interface BeltPromotionForm {
  studentId: number;
  fromBelt: string | null;
  fromStripes: number;
  toBelt: string;
  toStripes: number;
  promotionDate: string;
  notes: string | null;
  studentDisciplineId?: number | null;
}

export type StudentForm = Omit<Student, 'id' | 'belt' | 'stripes'>;

/** A classmate's birthday in the current month (portal "Cumpleaños del mes" card). Year is omitted by design. */
export interface Birthday {
  id: number;
  name: string;
  photoUrl: string | null;
  day: number;
  month: number;
}

// ─── Discipline belt configuration ───
export interface DisciplineBelt {
  id: number;
  name: string;
  colorHex: string;
  displayOrder: number;
}

export interface DisciplineAgeCategory {
  id: number;
  disciplineId: number;
  name: string;
  minAge: number | null;
  maxAge: number | null;
  displayOrder: number;
  belts: DisciplineBelt[];
}

// ─── StudentDiscipline ───
export interface CompetitionResult {
  id: number;
  studentDisciplineId: number;
  tournamentName: string;
  date: string;
  placement: string | null;
  category: string | null;
  beltAtCompetition: string | null;
  stripesAtCompetition: number;
  notes: string | null;
}

export interface CompetitionResultForm {
  tournamentName: string;
  date: string;
  placement: string;
  category: string;
  notes: string;
  beltAtCompetition?: string | null;
  stripesAtCompetition?: number;
}

export interface StudentDiscipline {
  id: number;
  studentId: number;
  disciplineId: number;
  disciplineName: string;
  ageCategoryId: number | null;
  ageCategoryName: string | null;
  belt: string | null;
  beltColorHex: string | null;
  stripes: number;
  joinDate: string | null;
  active: boolean;
  competitionResults: CompetitionResult[];
}

export interface StudentDisciplineForm {
  disciplineId: number;
  ageCategoryId: number | null;
  belt: string | null;
  stripes: number;
  joinDate: string | null;
}

// ─── Technique curriculum (per-belt program) ───
export interface Technique {
  id: number;
  beltId: number;
  name: string;
  description: string | null;
  position: string | null;
  videoUrl: string | null;
  displayOrder: number;
  /** Portal only: whether the logged-in student marked this learned. */
  learned?: boolean | null;
  learnedAt?: string | null;
}

export interface TechniqueBeltGroup {
  beltId: number;
  beltName: string;
  beltColorHex: string | null;
  displayOrder: number;
  current: boolean;
  reached: boolean;
  totalCount: number;
  learnedCount: number;
  techniques: Technique[];
}

export interface TechniqueCurriculum {
  disciplineId: number;
  disciplineName: string;
  ageCategoryName: string | null;
  currentBelt: string | null;
  totalCount: number;
  learnedCount: number;
  belts: TechniqueBeltGroup[];
}

export interface TechniqueForm {
  name: string;
  description: string;
  position: string;
  videoUrl: string;
}

// ─── Payment ───
export interface Payment {
  id: number;
  studentId: number;
  studentName: string;
  expectedAmount: number | null;
  amount: number;
  discount: number | null;
  discountType: 'AMOUNT' | 'PERCENT' | null;
  remaining: number | null;
  month: number;
  year: number;
  notes: string | null;
  paidAt: string | null;
  status?: string | null;   // PAID | PENDING_CONFIRMATION
  method?: string | null;   // MANUAL | TRANSFER | KHIPU | MERCADO_PAGO
  proofUrl?: string | null;
}

export interface PaymentOptions {
  khipu: boolean;
  mercadoPago: boolean;
  bankDetails: string | null;
}

export interface UpcomingClass {
  scheduleId: number;
  classDate: string;   // yyyy-MM-dd
  dayOfWeek: string;
  startTime: string;   // HH:mm
  endTime: string;     // HH:mm
  className: string;
  professorName: string | null;
  capacity: number | null;
  reservedCount: number;
  spotsLeft: number | null;
  mineReserved: boolean;
}

export interface AtRiskStudent {
  studentId: number;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  lastSessionDate: string | null;
  daysSinceLastSession: number | null;
  inactive: boolean;
  overduePayment: boolean;
}

export interface PaymentForm {
  studentId: number;
  expectedAmount?: number;
  amount: number;
  discount?: number;
  discountType?: 'AMOUNT' | 'PERCENT';
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
  professors: ProfessorPublic[];
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
  planId: number | null;
  professorId: number | null;
  professorName: string | null;
  professorPhotoUrl: string | null;
  capacity: number | null;
}

export interface ScheduleForm {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  className: string;
  planId?: number | null;
  professorId?: number | null;
  capacity?: number | null;
}

/** A student who reserved a given class occurrence (admin roster view). */
export interface ReservationRoster {
  studentId: number;
  name: string;
  photoUrl: string | null;
  belt: string | null;
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

export interface Discipline {
  id: number;
  name: string;
  active: boolean;
  ageCategories: DisciplineAgeCategory[];
}

export interface Professor {
  id: number;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  achievements: string | null;
  belt: string | null;
  displayOrder: number | null;
  active: boolean;
  studentId: number | null;
  studentName: string | null;
  disciplineId: number | null;
  disciplineName: string | null;
  email: string | null;
  effectiveEmail: string | null;
  hasAccount: boolean;
}

export interface ProfessorForm {
  name: string;
  photoUrl: string | null;
  bio: string | null;
  achievements: string | null;
  displayOrder: number;
  studentId: number | null;
  disciplineId: number | null;
  email: string | null;
}

export interface ProfessorPublic {
  id: number;
  name: string;
  photoUrl: string | null;
  bio: string | null;
  achievements: string | null;
  belt: string | null;
  planNames: string[];
  disciplineNames: string[];
}

export interface Plan {
  id: number;
  name: string;
  description: string;
  price: number;
  features: string;
  active: boolean;
  displayOrder: number;
  disciplineId: number | null;
  disciplineName: string | null;
  professorId: number | null;
  professorName: string | null;
}

export interface PlanForm {
  name: string;
  description: string;
  price: number;
  features: string;
  displayOrder: number;
  disciplineId: number | null;
  professorId: number | null;
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
  wpPhoneNumberId: string;
  wpAccessToken: string;
  wpVerifyToken: string;
  wpAdminPhones: string;
  bankDetails: string;
  mpAccessToken: string;
  khipuApiKey: string;
  paymentRemindersEnabled: boolean;
}

// ─── Training journal (student self-logged sessions) ───
export type TrainingModality = 'GI' | 'NOGI' | 'OPEN_MAT' | 'COMPETITION';
export type SubmissionDirection = 'LOGRADA' | 'RECIBIDA';

export interface TrainingSubmission {
  name: string;
  direction: SubmissionDirection;
}

export interface TrainingPartner {
  name: string;
  belt: string | null;
  partnerStudentId: number | null;
}

export interface Classmate {
  id: number;
  name: string;
  nickname: string | null;
  belt: string | null;
  stripes: number | null;
  photoUrl: string | null;
  age: number | null;
}

/** Card shown when tapping a name in a ranking. */
export interface StudentCard {
  id: number;
  name: string;
  nickname: string | null;
  belt: string | null;
  stripes: number | null;
  age: number | null;
  weight: number | null;
  photoUrl: string | null;
}

// ─── Duels (challenges between classmates) ───
export type DuelStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED' | 'COMPLETED';
/** Why a participant closed an accepted bout before fighting it. */
export type DuelCloseReason = 'SCARED' | 'POSTPONED';
export type DuelMethod = 'SUBMISSION' | 'POINTS' | 'DECISION' | 'DRAW' | 'DISQUALIFICATION';
/** Bout ruleset. Gi/No-Gi (modality) only applies to SUBMISSION. */
export type DuelFormat = 'SUBMISSION' | 'COMBAT_JJ' | 'MMA' | 'NO_RULES';

export interface Duel {
  id: number;
  status: DuelStatus;
  challengerId: number;
  challengerName: string;
  challengerPhotoUrl: string | null;
  opponentId: number;
  opponentName: string;
  opponentPhotoUrl: string | null;
  refereeId: number | null;
  refereeName: string | null;
  format: DuelFormat | null;
  modality: TrainingModality | null;
  message: string | null;
  scheduledAt: string | null;
  location: string | null;
  winnerStudentId: number | null;
  winnerName: string | null;
  method: DuelMethod | null;
  submissionName: string | null;
  challengerScore: number | null;
  opponentScore: number | null;
  resultNotes: string | null;
  reportedBy: number | null;
  closeReason: DuelCloseReason | null;
  createdAt: string;
  respondedAt: string | null;
  completedAt: string | null;
}

/** One keyset page of the academy feed. nextCursor is opaque; null means no more rows. */
export interface DuelFeedPage {
  items: Duel[];
  nextCursor: string | null;
}

export interface DuelRankingEntry {
  studentId: number;
  name: string;
  photoUrl: string | null;
  wins: number;
  losses: number;
  draws: number;
}

export interface CreateDuelRequest {
  opponentStudentId: number;
  refereeStudentId?: number | null;
  format?: DuelFormat | null;
  modality?: TrainingModality | null;
  message?: string | null;
  /** Agreed date/time, local ISO without offset (e.g. "2026-06-20T18:30"). */
  scheduledAt?: string | null;
  location?: string | null;
}

export interface DuelResultRequest {
  winnerStudentId?: number | null;
  method: DuelMethod;
  submissionName?: string | null;
  challengerScore?: number | null;
  opponentScore?: number | null;
  notes?: string | null;
}

export interface TrainingSession {
  id: number;
  disciplineId: number | null;
  disciplineName: string | null;
  date: string; // YYYY-MM-DD
  backdated: boolean; // logged late for a past day; excluded from the streak
  modality: TrainingModality | null;
  durationMin: number | null;
  roundsCount: number | null;
  energy: number | null;
  performance: number | null;
  notes: string | null;
  techniques: string[];
  submissions: TrainingSubmission[];
  partners: TrainingPartner[];
  createdAt: string;
}

/** Payload to create a session — everything except modality/date is optional. */
export interface TrainingSessionForm {
  disciplineId?: number | null;
  date?: string;
  /** True for a late entry (Ayer/Anteayer) — recorded but excluded from the streak. */
  backdated?: boolean;
  modality?: TrainingModality | null;
  durationMin?: number | null;
  roundsCount?: number | null;
  energy?: number | null;
  performance?: number | null;
  notes?: string | null;
  techniques?: string[];
  submissions?: TrainingSubmission[];
  partners?: TrainingPartner[];
}

// ─── Conditioning (strength & physical prep journal) ───
export type ConditioningFocus = 'PIERNA' | 'ESPALDA' | 'PECHO' | 'HOMBRO' | 'BRAZO' | 'CORE' | 'CARDIO' | 'FULL_BODY';

export interface ConditioningSet {
  reps: number | null;
  weightKg: number | null;
}

export interface ConditioningExercise {
  name: string;
  restSec: number | null;
  sets: ConditioningSet[];
}

export interface ConditioningSession {
  id: number;
  date: string; // YYYY-MM-DD
  backdated: boolean;
  focus: ConditioningFocus | null;
  durationMin: number | null;
  notes: string | null;
  exercises: ConditioningExercise[];
  createdAt: string;
}

/** Payload to log a conditioning session. */
export interface ConditioningSessionForm {
  date?: string;
  backdated?: boolean;
  focus?: ConditioningFocus | null;
  durationMin?: number | null;
  notes?: string | null;
  exercises: ConditioningExercise[];
}

/** One row of the academy training leaderboard. */
export interface LeaderboardEntry {
  studentId: number;
  name: string;
  photoUrl: string | null;
  thisWeekCount: number;
  currentStreak: number;
}

export interface TrainingSummary {
  weeklyGoal: number | null;
  thisWeekCount: number;
  currentStreak: number;
  maxStreak: number;
  weeklyGoalMet: boolean;
  /** Length of the streak that just broke (repairable 1-day gap); 0 when there's nothing to recover. */
  lostStreak: number;
  /** True when there's a repairable gap and the student still has repairs left this month. */
  repairAvailable: boolean;
  /** Streak repairs remaining this calendar month. */
  repairsLeft: number;
  monthSessions: number;
  monthMinutes: number;
  monthRounds: number;
}
