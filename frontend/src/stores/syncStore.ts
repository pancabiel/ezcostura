import { create } from 'zustand';

export type ConnectionState = 'online' | 'offline';
export type SyncPhase = 'idle' | 'syncing' | 'error';

interface SyncState {
  connection: ConnectionState;
  phase: SyncPhase;
  lastSyncAt?: string;
  lastError?: string;
  pendingCount: number;
  setConnection: (s: ConnectionState) => void;
  setPhase: (p: SyncPhase, error?: string) => void;
  setPendingCount: (n: number) => void;
  markSynced: () => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  connection: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'online',
  phase: 'idle',
  pendingCount: 0,
  setConnection: (connection) => set({ connection }),
  setPhase: (phase, error) =>
    set({ phase, lastError: phase === 'error' ? error : undefined }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  markSynced: () =>
    set({ phase: 'idle', lastSyncAt: new Date().toISOString(), lastError: undefined }),
}));
