import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      type = 'button',
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-bold transition-all duration-150 rounded-xl cursor-pointer select-none active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100';

    const sizeStyles = {
      sm: 'h-9 px-3 text-xs gap-1.5',
      md: 'h-11 px-4 text-xs sm:text-sm gap-2',
      lg: 'h-12 px-6 text-sm sm:text-base gap-2.5',
    };

    const variantStyles = {
      primary:
        'bg-[#D94949] hover:bg-[#C53B3B] active:bg-[#B33434] text-white shadow-2xs hover:shadow-xs border border-transparent',
      secondary:
        'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200/90 shadow-2xs hover:border-slate-300',
      outline:
        'bg-transparent hover:bg-slate-100 text-slate-700 border border-slate-300',
      danger:
        'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-2xs',
      success:
        'bg-[#009966] hover:bg-[#008055] active:bg-[#006644] text-white shadow-2xs',
      ghost:
        'bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-transparent',
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Loading...</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
