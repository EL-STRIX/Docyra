import { Link } from 'react-router-dom';

export function Logo({ className = '', isLight = false }) {
  return (
    <Link to="/" className={`flex items-center gap-2.5 group ${className}`}>
      {/* Abstract geometric mark: rounded trust badge with medical cross/pulse */}
      <div className="w-9 h-9 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
        <svg
          className="w-5 h-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          <path d="M12 7v6" />
          <path d="M9 10h6" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span
          className={`text-2xl font-bold tracking-tight leading-none ${
            isLight ? 'text-white' : 'text-brand-primary'
          }`}
        >
          Docyra
        </span>
        <span className={`text-[10px] font-medium tracking-wide ${isLight ? 'text-teal-200' : 'text-neutral-text-secondary'}`}>
          Healthcare Platform
        </span>
      </div>
    </Link>
  );
}

export default Logo;
