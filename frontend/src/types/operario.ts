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
  /** Tem acesso ao portal do operário (PIN definido). Vem do backend no pull. */
  temPin?: boolean;
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
  temPin?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
