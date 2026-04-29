import type { SyncStatus } from './lote';

export type TipoAusencia = 'ATESTADO' | 'FALTA' | 'FERIAS' | 'FOLGA';

export interface AusenciaLocal {
  id: string;
  serverId?: string;
  operarioId: string;
  dataInicio: string;
  dataFim: string;
  tipo: TipoAusencia;
  observacao?: string;
  syncStatus: SyncStatus;
  updatedAt: string;
  syncError?: string;
  pendingDelete?: boolean;
}

export interface AusenciaWire {
  id: string;
  operarioId: string;
  dataInicio: string;
  dataFim: string;
  tipo: TipoAusencia;
  observacao?: string;
  createdAt?: string;
}
