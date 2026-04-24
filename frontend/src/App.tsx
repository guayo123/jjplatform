import { Routes, Route } from 'react-router-dom';

import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/public/Home';
import AcademyProfile from './pages/public/AcademyProfile';
import Login from './pages/admin/Login';
import Dashboard from './pages/admin/Dashboard';
import Students from './pages/admin/Students';
import StudentForm from './pages/admin/StudentForm';
import StudentDetail from './pages/admin/StudentDetail';
import Payments from './pages/admin/Payments';
import PaymentsReport from './pages/admin/PaymentsReport';
import Tournaments from './pages/admin/Tournaments';
import TournamentDetail from './pages/admin/TournamentDetail';
import Photos from './pages/admin/Photos';
import Users from './pages/admin/Users';
import Settings from './pages/admin/Settings';
import Plans from './pages/admin/Plans';
import Schedules from './pages/admin/Schedules';
import SuperAcademies from './pages/super/Academies';

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Home />} />
      <Route path="/academies/:id" element={<AcademyProfile />} />
      <Route path="/login" element={<Login />} />

      {/* Private routes */}
      <Route element={<PrivateRoute />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/students" element={<Students />} />
          <Route path="/admin/students/new" element={<StudentForm />} />
          <Route path="/admin/students/:id/edit" element={<StudentForm />} />
          <Route path="/admin/students/:id" element={<StudentDetail />} />
          <Route path="/admin/payments" element={<Payments />} />
          <Route path="/admin/payments/report" element={<PaymentsReport />} />
          <Route path="/admin/tournaments" element={<Tournaments />} />
          <Route path="/admin/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/admin/photos" element={<Photos />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/plans" element={<Plans />} />
          <Route path="/admin/schedules" element={<Schedules />} />
          <Route path="/super/academies" element={<SuperAcademies />} />
        </Route>
      </Route>
    </Routes>
  );
}
