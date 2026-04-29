import type { SyncStatus } from './lote';

export interface PackLocal {
  id: string;
  serverId?: string;
  operarioId: string;
  data: string;       // ISO date (YYYY-MM-DD)
  horario: string;    // ISO datetime
  alocacaoId: string;
  quantidade: number;
  registradoPor?: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  syncError?: string;
  pendingDelete?: boolean;
}

export interface PackWire {
  id: string;
  operarioId: string;
  data: string;
  horario: string;
  alocacaoId: string;
  quantidade: number;
  registradoPor?: string;
  createdAt?: string;
}
