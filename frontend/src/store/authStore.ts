import { create } from 'zustand';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: 'MASTER' | 'ADMIN' | 'USER';
  sectors: string[];
  pictureUrl?: string;
}

interface AuthState {
  token: string | null;
  user: UserSession | null;
  isAuthenticated: boolean;
  login: (token: string, user: Omit<UserSession, 'sectors'>) => void;
  logout: () => void;
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
  const storedToken = localStorage.getItem('setoriza_token');
  const storedUser = localStorage.getItem('setoriza_user');

  let initialToken: string | null = storedToken;
  let initialUser: UserSession | null = null;
  let isExpired = false;

  if (storedToken) {
    const claims = parseJwt(storedToken);
    if (claims && claims.exp) {
      const expirationDate = new Date(claims.exp * 1000);
      if (expirationDate.getTime() < Date.now()) {
        isExpired = true;
      }
    } else {
      isExpired = true;
    }
  }

  if (isExpired) {
    localStorage.removeItem('setoriza_token');
    localStorage.removeItem('setoriza_user');
    initialToken = null;
    initialUser = null;
  } else if (storedUser) {
    try {
      initialUser = JSON.parse(storedUser);
    } catch (e) {
      console.error('Error parsing stored user session', e);
    }
  }

  return {
    token: initialToken,
    user: initialUser,
    isAuthenticated: !!initialToken && !!initialUser,
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
      };

      localStorage.setItem('setoriza_token', token);
      localStorage.setItem('setoriza_user', JSON.stringify(fullUser));
      set({ token, user: fullUser, isAuthenticated: true });
    },
    logout: () => {
      localStorage.removeItem('setoriza_token');
      localStorage.removeItem('setoriza_user');
      set({ token: null, user: null, isAuthenticated: false });
    },
  };
});
