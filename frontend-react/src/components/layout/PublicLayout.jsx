import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-bg">
      <Navbar />
      <main className="flex-1 w-full">
        {children || <Outlet />}
      </main>
      <Footer />
    </div>
  );
}

export default PublicLayout;
