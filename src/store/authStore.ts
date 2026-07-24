import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'CASHIER';
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  // Safe check for server-side rendering
  const getLocalStorage = (key: string) => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  };

  const initialUserRaw = getLocalStorage('kyra_user');
  const initialUser = initialUserRaw ? JSON.parse(initialUserRaw) : null;
  const initialToken = getLocalStorage('kyra_token');

  return {
    user: initialUser,
    token: initialToken,
    login: (user, token) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('kyra_user', JSON.stringify(user));
        localStorage.setItem('kyra_token', token);
      }
      set({ user, token });
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kyra_user');
        localStorage.removeItem('kyra_token');
      }
      set({ user: null, token: null });
    },
  };
});
