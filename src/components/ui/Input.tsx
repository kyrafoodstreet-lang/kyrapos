import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      leftIcon,
      rightIcon,
      helperText,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-bold text-slate-700 tracking-tight"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}

          <input
            id={inputId}
            ref={ref}
            className={`w-full h-11 bg-white border rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 transition-all duration-150 outline-none ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
                : 'border-slate-200/90 hover:border-slate-300 focus:border-[#D94949] focus:ring-2 focus:ring-[#D94949]/15'
            } disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3.5 text-slate-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xxs font-semibold text-rose-600 animate-in fade-in-50 duration-150">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p className="text-xxs font-medium text-slate-400">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
