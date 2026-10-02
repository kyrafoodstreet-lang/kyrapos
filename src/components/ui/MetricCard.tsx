import React from 'react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  iconBgColor?: string;
  iconTextColor?: string;
  growth?: number | null;
  growthLabel?: string;
  subtext?: string;
  prefix?: string;
  className?: string;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  icon,
  iconBgColor = 'bg-rose-50',
  iconTextColor = 'text-[#D94949]',
  growth,
  growthLabel = 'vs last period',
  subtext,
  prefix = '',
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 hover:shadow-sm transition-all ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        {icon && (
          <div
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${iconBgColor} ${iconTextColor} border border-slate-100 flex items-center justify-center font-bold shrink-0`}
          >
            {icon}
          </div>
        )}
        <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
          <span className="truncate">{title}</span>
        </div>
      </div>

      <div className="my-2.5 sm:my-3">
        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 tracking-tight font-mono tabular-nums">
          {prefix}
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      </div>

      <div className="flex items-center justify-between gap-1 text-[11px]">
        {growth !== undefined && growth !== null ? (
          <div className="flex items-center gap-1">
            <span
              className={`font-bold px-1.5 py-0.5 rounded text-[10px] sm:text-xxs ${
                growth >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-600'
              }`}
            >
              {growth >= 0 ? `+${growth}%` : `${growth}%`}
            </span>
            <span className="text-slate-400 font-medium text-[10px] sm:text-xxs truncate">
              {growthLabel}
            </span>
          </div>
        ) : subtext ? (
          <span className="text-slate-400 font-medium text-[10px] sm:text-xxs truncate">
            {subtext}
          </span>
        ) : null}
      </div>
    </div>
  );
};
