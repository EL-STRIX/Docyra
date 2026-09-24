import { Link } from 'react-router-dom';
import { HeartPulse, Home, Search } from 'lucide-react';



export function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-20">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="w-20 h-20 rounded-3xl bg-brand-primary-light text-brand-primary flex items-center justify-center mx-auto shadow-sm">
          <HeartPulse className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="text-5xl font-extrabold text-brand-primary">404</span>
          <h1 className="text-2xl sm:text-3xl font-bold text-neutral-text-primary">
            Page Not Found
          </h1>
          <p className="text-sm text-neutral-text-secondary leading-relaxed">
            The page you are looking for may have been moved, renamed, or is temporarily unavailable.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="btn-primary w-full sm:w-auto text-xs py-2.5 px-5">
            <Home className="w-3.5 h-3.5" />
            <span>Return to Homepage</span>
          </Link>
          <Link to="/doctors" className="btn-outline w-full sm:w-auto text-xs py-2.5 px-5">
            <Search className="w-3.5 h-3.5" />
            <span>Search Doctors</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
