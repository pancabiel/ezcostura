import { create } from 'zustand';

export interface PortalSession {
  accessToken: string;
  refreshToken: string;
  operarioId: string;
  nome: string;
  tenantId: string;
}

interface PortalAuthState {
  session: PortalSession | null;
  setSession: (s: PortalSession | null) => void;
}

const STORAGE_KEY = 'ezcostura.portal.auth';

function load(): PortalSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PortalSession) : null;
  } catch {
    return null;
  }
}

function save(s: PortalSession | null) {
  if (s) localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  else localStorage.removeItem(STORAGE_KEY);
}

export const usePortalAuthStore = create<PortalAuthState>((set) => ({
  session: load(),
  setSession: (session) => {
    save(session);
    set({ session });
  },
}));

export function getPortalSession(): PortalSession | null {
  return usePortalAuthStore.getState().session;
}
