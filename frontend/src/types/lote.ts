export type SyncStatus = 'pending' | 'synced' | 'error';

export interface Operacao {
  id: string;
  nome: string;
  metaPorHora: number;
}

export interface Tamanho {
  id: string;
  tamanho: string;
  quantidade: number;
}

/** Local-first record stored in Dexie. */
export interface LoteLocal {
  /** Local UUID — stable identity inside the device. */
  id: string;
  /** Server-assigned UUID, present after a successful sync. */
  serverId?: string;
  codigo: string;
  nome: string;
  descricao?: string;
  /** Quando true, o lote foi concluído: não aparece mais nos selects de facilitador/gerenciador. Reversível. */
  finalizado: boolean;
  operacoes: Operacao[];
  tamanhos: Tamanho[];
  syncStatus: SyncStatus;
  /** ISO timestamp — criação (usado para ordenar os selects do mais recente ao mais antigo). */
  createdAt?: string;
  /** ISO timestamp — last local mutation. */
  updatedAt: string;
  /** Last sync error message, if any. */
  syncError?: string;
  /** Set true to delete on next sync. */
  pendingDelete?: boolean;
}

/** Wire format used by the backend. */
export interface LoteWire {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  finalizado: boolean;
  operacoes: Operacao[];
  tamanhos: Tamanho[];
  createdAt?: string;
  updatedAt?: string;
}
