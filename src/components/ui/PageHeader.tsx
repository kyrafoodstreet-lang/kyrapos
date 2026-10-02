import React from 'react';

export interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100/80 text-[#D94949] flex items-center justify-center font-bold shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {description}
            </p>
          )}
        </div>
      </div>

      {action && (
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {action}
        </div>
      )}
    </div>
  );
};
