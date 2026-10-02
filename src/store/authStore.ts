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
  alwaysLogin: boolean;
  login: (user: User, token: string, alwaysLogin?: boolean) => void;
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
  const initialAlwaysLogin = getLocalStorage('kyra_always_login') === 'true';

  return {
    user: initialUser,
    token: initialToken,
    alwaysLogin: initialAlwaysLogin,
    login: (user, token, alwaysLogin = true) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('kyra_user', JSON.stringify(user));
        localStorage.setItem('kyra_token', token);
        if (alwaysLogin) {
          localStorage.setItem('kyra_always_login', 'true');
        } else {
          localStorage.removeItem('kyra_always_login');
        }
      }
      set({ user, token, alwaysLogin });
    },
    logout: () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('kyra_user');
        localStorage.removeItem('kyra_token');
        localStorage.removeItem('kyra_always_login');
      }
      set({ user: null, token: null, alwaysLogin: false });
    },
  };
});
