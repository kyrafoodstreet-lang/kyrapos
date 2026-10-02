import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'dark';
  noPadding?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      noPadding = false,
      className = '',
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default:
        'bg-white border border-slate-200/80 rounded-2xl shadow-xs hover:border-slate-300 transition-all',
      elevated:
        'bg-white border border-slate-200/80 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-300 transition-all',
      bordered:
        'bg-white border-2 border-slate-200 rounded-2xl shadow-none',
      dark:
        'bg-slate-900 border border-slate-800 text-white rounded-2xl shadow-sm',
    };

    const paddingClass = noPadding ? '' : 'p-4 sm:p-5';

    return (
      <div
        ref={ref}
        className={`${variantStyles[variant]} ${paddingClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
