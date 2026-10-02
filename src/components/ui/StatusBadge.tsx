import React from 'react';

export type StatusType =
  | 'ACTIVE'
  | 'PLAYING'
  | 'COMPLETED'
  | 'PENDING'
  | 'CANCELLED'
  | 'FAILED'
  | 'PAID'
  | 'UNPAID'
  | 'OVERTIME'
  | 'DRAFT'
  | string;

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
  showDot?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'sm',
  className = '',
  showDot = false,
}) => {
  const normalized = (status || '').toUpperCase();

  const getStyle = () => {
    switch (normalized) {
      case 'ACTIVE':
      case 'PLAYING':
      case 'PAID':
      case 'CONFIRMED':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
          dot: 'bg-emerald-500',
        };
      case 'COMPLETED':
      case 'SETTLED':
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          dot: 'bg-slate-500',
        };
      case 'PENDING':
      case 'UNPAID':
      case 'PARTIAL':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
          dot: 'bg-amber-500',
        };
      case 'CANCELLED':
      case 'FAILED':
      case 'OVERDUE':
      case 'OVERTIME':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
          dot: 'bg-rose-500 animate-pulse',
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-600 border-slate-200',
          dot: 'bg-slate-400',
        };
    }
  };

  const style = getStyle();
  const displayLabel = label || normalized;

  const sizeClass =
    size === 'sm'
      ? 'text-[10px] px-2 py-0.5'
      : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wider rounded-md border ${style.bg} ${sizeClass} ${className}`}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shrink-0`} />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
