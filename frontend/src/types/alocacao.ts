import type { SyncStatus } from './lote';

export interface AlocacaoLocal {
  id: string;
  serverId?: string;
  operarioId: string;
  data: string;          // ISO date
  horarioInicio: string; // HH:mm
  loteId: string;
  operacaoId: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  syncError?: string;
  pendingDelete?: boolean;
}

export interface AlocacaoWire {
  id: string;
  operarioId: string;
  data: string;
  horarioInicio: string;
  loteId: string;
  operacaoId: string;
  createdAt?: string;
}
