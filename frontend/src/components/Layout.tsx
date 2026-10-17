import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import AdminBottomNav from './AdminBottomNav';
import BackButton from './BackButton';

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BackButton />
        <Outlet />
      </main>
      <Footer />
      <AdminBottomNav />
    </div>
  );
}
