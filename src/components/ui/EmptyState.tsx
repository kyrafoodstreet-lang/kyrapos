import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-8 sm:p-12 text-center flex flex-col items-center justify-center bg-white border border-slate-200/80 rounded-2xl shadow-xs space-y-3 ${className}`}
    >
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center font-bold mb-1">
          {icon}
        </div>
      )}
      <h3 className="font-bold text-sm sm:text-base text-slate-800 tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-400 max-w-sm font-medium">
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
};
