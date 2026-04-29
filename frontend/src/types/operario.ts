import type { SyncStatus } from './lote';

export interface OperarioLocal {
  id: string;
  serverId?: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  dataAdmissao: string; // ISO date
  ativo: boolean;
  syncStatus: SyncStatus;
  updatedAt: string;
  syncError?: string;
  pendingDelete?: boolean;
}

export interface OperarioWire {
  id: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  dataAdmissao: string;
  ativo: boolean;
  createdAt?: string;
  updatedAt?: string;
}
