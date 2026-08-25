import { create } from 'zustand';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'USER';
  sectors: string[];
  pictureUrl?: string;
  requirePasswordChange: boolean;
}

interface AuthState {
  token: string | null;
  user: UserSession | null;
  isAuthenticated: boolean;
  isDarkMode: boolean;
  login: (token: string, user: Omit<UserSession, 'sectors'>) => void;
  logout: () => void;
  toggleTheme: () => void;
  setPasswordChanged: () => void;
}

function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to parse JWT token', e);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const storedUser = localStorage.getItem('setoriza_user');

  const getInitialTheme = () => {
    const saved = localStorage.getItem('setoriza_theme');
    if (saved) {
      return saved === 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const initialDark = getInitialTheme();
  // Apply immediately on file load to avoid flash
  if (initialDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  let initialToken = localStorage.getItem('setoriza_token') || null;
  let initialUser: UserSession | null = null;

  if (storedUser) {
    try {
      initialUser = JSON.parse(storedUser);
    } catch (e) {
      console.error('Error parsing stored user session', e);
    }
  }

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: !!initialUser,
    isDarkMode: initialDark,
    login: (token, userDetails) => {
      // Decode JWT to extract sectors claim
      const claims = parseJwt(token);
      let sectorsList: string[] = [];
      
      if (claims && claims.sectors) {
        // sectors is typically a comma-separated string like "Fiscal,DP" or a JSON list
        if (typeof claims.sectors === 'string') {
          sectorsList = claims.sectors.split(',').map((s: string) => s.trim()).filter(Boolean);
        } else if (Array.isArray(claims.sectors)) {
          sectorsList = claims.sectors;
        }
      }

      const fullUser: UserSession = {
        ...userDetails,
        role: (claims?.role || userDetails.role || 'USER') as any,
        sectors: sectorsList,
        requirePasswordChange: userDetails.requirePasswordChange || false,
      };

      localStorage.setItem('setoriza_user', JSON.stringify(fullUser));
      localStorage.setItem('setoriza_token', token);
      set({ token, user: fullUser, isAuthenticated: true });
    },
    logout: () => {
      const host = window.location.hostname === 'localhost' ? 'http://localhost:8080' : window.location.origin;
      fetch(`${host}/api/v1/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      }).catch(err => {
        console.error('Erro ao chamar logout no backend:', err);
      });

      localStorage.removeItem('setoriza_user');
      localStorage.removeItem('setoriza_token');
      set({ token: null, user: null, isAuthenticated: false });
    },
    toggleTheme: () => set((state) => {
      const nextTheme = !state.isDarkMode;
      localStorage.setItem('setoriza_theme', nextTheme ? 'dark' : 'light');
      // Sync theme with document classList
      if (nextTheme) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      return { isDarkMode: nextTheme };
    }),
    setPasswordChanged: () => set((state) => {
      if (!state.user) return {};
      const updatedUser = { ...state.user, requirePasswordChange: false };
      localStorage.setItem('setoriza_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    }),
  };
});
