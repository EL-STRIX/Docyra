import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, ArrowLeft, Home } from 'lucide-react';

export const NotFound = () => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center space-y-6">
      <div className="w-20 h-20 rounded-3xl bg-docyra-primary-light text-docyra-primary flex items-center justify-center mx-auto shadow-inner">
        <Stethoscope className="w-10 h-10" />
      </div>
      <span className="text-sm font-bold text-docyra-accent uppercase tracking-wider">404 Error</span>
      <h1 className="text-4xl sm:text-5xl font-extrabold text-docyra-text-primary tracking-tight">
        Page Not Found
      </h1>
      <p className="text-sm text-docyra-text-secondary max-w-md mx-auto leading-relaxed">
        The page you are looking for does not exist, has been moved, or is temporarily unavailable.
      </p>
      <div className="pt-4 flex items-center justify-center gap-4">
        <Link to="/" className="btn-primary text-xs flex items-center gap-1.5 py-2.5 px-6">
          <Home className="w-4 h-4" />
          <span>Go Home</span>
        </Link>
        <Link to="/doctors" className="btn-outline text-xs flex items-center gap-1.5 py-2.5 px-6">
          <span>Find a Doctor</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
