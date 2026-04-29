import { create } from 'zustand';

export type Role = 'ADMIN' | 'OPERADOR';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  userId: string;
  username: string;
  tenantId: string;
  role: Role;
}

interface AuthState {
  session: AuthSession | null;
  setSession: (s: AuthSession | null) => void;
}

const STORAGE_KEY = 'ezcostura.auth';

function load(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

function save(s: AuthSession | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}

export const useAuthStore = create<AuthState>((set) => ({
  session: load(),
  setSession: (session) => {
    save(session);
    set({ session });
  },
}));

export function getSession(): AuthSession | null {
  return useAuthStore.getState().session;
}
