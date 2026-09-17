import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export const PublicLayout = ({ user, onLogout }) => {
  return (
    <div className="min-h-screen flex flex-col bg-docyra-neutral-bg text-docyra-text-primary selection:bg-docyra-primary-light selection:text-docyra-primary">
      <Navbar user={user} onLogout={onLogout} />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
