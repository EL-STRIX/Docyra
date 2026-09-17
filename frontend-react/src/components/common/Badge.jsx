import React from 'react';

export const Badge = ({ children, variant = 'primary', className = '' }) => {
  const variantStyles = {
    primary: 'bg-docyra-primary-light text-docyra-primary border-docyra-primary/20',
    accent: 'bg-amber-50 text-amber-800 border-amber-200',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    neutral: 'bg-stone-100 text-stone-700 border-stone-200'
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${variantStyles[variant] || variantStyles.primary} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
