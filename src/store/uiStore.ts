import { create } from 'zustand';

interface UiState {
  selectedCategoryId: string | null;
  searchQuery: string;
  setSelectedCategoryId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  selectedCategoryId: null,
  searchQuery: '',
  setSelectedCategoryId: (selectedCategoryId) => set({ selectedCategoryId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
