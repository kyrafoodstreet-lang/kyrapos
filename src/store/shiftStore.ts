import { create } from 'zustand';

interface Shift {
  id: string;
  cashierId: string;
  openingCash: number;
  status: 'OPEN' | 'CLOSED';
  openingTime: string;
  computedCashSales?: number;
  computedCardSales?: number;
  computedUpiSales?: number;
  computedExpenses?: number;
}

interface ShiftState {
  activeShift: Shift | null;
  setActiveShift: (shift: Shift | null) => void;
}

export const useShiftStore = create<ShiftState>((set) => ({
  activeShift: null,
  setActiveShift: (activeShift) => set({ activeShift }),
}));
