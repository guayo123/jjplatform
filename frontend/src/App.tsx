import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import StudentRoute from './components/StudentRoute';
import { useAndroidBackButton } from './native/useAndroidBackButton';
import { usePlatform } from './native/usePlatform';
import { useAuthStore } from './stores/authStore';
import Home from './pages/public/Home';
import AcademyProfile from './pages/public/AcademyProfile';
import PrivacyPolicy from './pages/public/PrivacyPolicy';
import DeleteAccount from './pages/public/DeleteAccount';
import Login from './pages/admin/Login';
import StudentLogin from './pages/portal/StudentLogin';
import StudentRegister from './pages/portal/StudentRegister';
import StudentForgotPassword from './pages/portal/StudentForgotPassword';

const Dashboard      = lazy(() => import('./pages/admin/Dashboard'));
const Students       = lazy(() => import('./pages/admin/Students'));
const StudentForm    = lazy(() => import('./pages/admin/StudentForm'));
const StudentDetail  = lazy(() => import('./pages/admin/StudentDetail'));
const Payments       = lazy(() => import('./pages/admin/Payments'));
const PaymentsReport = lazy(() => import('./pages/admin/PaymentsReport'));
const Tournaments    = lazy(() => import('./pages/admin/Tournaments'));
const TournamentDetail = lazy(() => import('./pages/admin/TournamentDetail'));
const Photos         = lazy(() => import('./pages/admin/Photos'));
const Users          = lazy(() => import('./pages/admin/Users'));
const ChangePassword = lazy(() => import('./pages/admin/ChangePassword'));
const Settings       = lazy(() => import('./pages/admin/Settings'));
const Plans          = lazy(() => import('./pages/admin/Plans'));
const Schedules      = lazy(() => import('./pages/admin/Schedules'));
const Disciplines    = lazy(() => import('./pages/admin/Disciplines'));
const Professors     = lazy(() => import('./pages/admin/Professors'));
const ProfessorForm  = lazy(() => import('./pages/admin/ProfessorForm'));
const Notifications  = lazy(() => import('./pages/admin/Notifications'));
const SuperAcademies = lazy(() => import('./pages/super/Academies'));
const Portal          = lazy(() => import('./pages/portal/Portal'));
const PortalChangePassword = lazy(() => import('./pages/admin/ChangePassword'));

/**
 * Root entry. On the website "/" is the public academy page. Inside the native app
 * (APK/IPA) there is no academy marketing site — the app exists to be the student's
 * portal — so we open straight on the student login (or the portal if a session is
 * already restored), never on the academy web page.
 */
function RootEntry() {
  const { isNative } = usePlatform();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (isNative) {
    return <Navigate to={isAuthenticated ? '/portal' : '/portal/login'} replace />;
  }
  return <Home />;
}

export default function App() {
  useAndroidBackButton();
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<RootEntry />} />
      <Route path="/academies/:id" element={<AcademyProfile />} />
      <Route path="/privacidad" element={<PrivacyPolicy />} />
      <Route path="/eliminar-cuenta" element={<DeleteAccount />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/login" element={<Login />} />
      <Route path="/portal/login" element={<StudentLogin />} />
      <Route path="/portal/registro" element={<StudentRegister />} />
      <Route path="/portal/recuperar" element={<StudentForgotPassword />} />

      {/* Student portal — STUDENT role only */}
      <Route element={<StudentRoute />}>
        <Route path="/portal" element={<Suspense><Portal /></Suspense>} />
        <Route path="/portal/cambiar-clave" element={<Suspense><PortalChangePassword /></Suspense>} />
      </Route>

      {/* Private routes — loaded lazily */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<Suspense><Dashboard /></Suspense>} />
          <Route path="/admin/students" element={<Suspense><Students /></Suspense>} />
          <Route path="/admin/students/new" element={<Suspense><StudentForm /></Suspense>} />
          <Route path="/admin/students/:id/edit" element={<Suspense><StudentForm /></Suspense>} />
          <Route path="/admin/students/:id" element={<Suspense><StudentDetail /></Suspense>} />
          <Route path="/admin/payments" element={<Suspense><Payments /></Suspense>} />
          <Route path="/admin/payments/report" element={<Suspense><PaymentsReport /></Suspense>} />
          <Route path="/admin/tournaments" element={<Suspense><Tournaments /></Suspense>} />
          <Route path="/admin/tournaments/:id" element={<Suspense><TournamentDetail /></Suspense>} />
          <Route path="/admin/photos" element={<Suspense><Photos /></Suspense>} />
          <Route path="/admin/users" element={<Suspense><Users /></Suspense>} />
          <Route path="/admin/change-password" element={<Suspense><ChangePassword /></Suspense>} />
          <Route path="/admin/settings" element={<Suspense><Settings /></Suspense>} />
          <Route path="/admin/professors" element={<Suspense><Professors /></Suspense>} />
          <Route path="/admin/professors/new" element={<Suspense><ProfessorForm /></Suspense>} />
          <Route path="/admin/professors/:id/edit" element={<Suspense><ProfessorForm /></Suspense>} />
          <Route path="/admin/disciplines" element={<Suspense><Disciplines /></Suspense>} />
          <Route path="/admin/plans" element={<Suspense><Plans /></Suspense>} />
          <Route path="/admin/schedules" element={<Suspense><Schedules /></Suspense>} />
          <Route path="/admin/notifications" element={<Suspense><Notifications /></Suspense>} />
          <Route path="/super/academies" element={<Suspense><SuperAcademies /></Suspense>} />
        </Route>
      </Route>
    </Routes>
  );
}
