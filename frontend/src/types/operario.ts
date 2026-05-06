import type { SyncStatus } from './lote';

export interface OperarioLocal {
  id: string;
  serverId?: string;
  nome: string;
  cpf?: string;
  telefone?: string;
  dataAdmissao: string; // ISO date
  ativo: boolean;
  /** Sempre o id local da jornada (resolvido do serverId quando vem do backend). */
  jornadaId: string;
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
  jornadaId: string;
  createdAt?: string;
  updatedAt?: string;
}
