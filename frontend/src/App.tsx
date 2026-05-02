import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/public/Home';
import AcademyProfile from './pages/public/AcademyProfile';
import Login from './pages/admin/Login';

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
const Settings       = lazy(() => import('./pages/admin/Settings'));
const Plans          = lazy(() => import('./pages/admin/Plans'));
const Schedules      = lazy(() => import('./pages/admin/Schedules'));
const Disciplines    = lazy(() => import('./pages/admin/Disciplines'));
const Professors     = lazy(() => import('./pages/admin/Professors'));
const ProfessorForm  = lazy(() => import('./pages/admin/ProfessorForm'));
const SuperAcademies = lazy(() => import('./pages/super/Academies'));

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/academies/:id" element={<AcademyProfile />} />
      <Route path="/login" element={<Login />} />

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
          <Route path="/admin/settings" element={<Suspense><Settings /></Suspense>} />
          <Route path="/admin/professors" element={<Suspense><Professors /></Suspense>} />
          <Route path="/admin/professors/new" element={<Suspense><ProfessorForm /></Suspense>} />
          <Route path="/admin/professors/:id/edit" element={<Suspense><ProfessorForm /></Suspense>} />
          <Route path="/admin/disciplines" element={<Suspense><Disciplines /></Suspense>} />
          <Route path="/admin/plans" element={<Suspense><Plans /></Suspense>} />
          <Route path="/admin/schedules" element={<Suspense><Schedules /></Suspense>} />
          <Route path="/super/academies" element={<Suspense><SuperAcademies /></Suspense>} />
        </Route>
      </Route>
    </Routes>
  );
}
