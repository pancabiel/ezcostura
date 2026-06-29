export type SyncStatus = 'pending' | 'synced' | 'error';

export interface Operacao {
  id: string;
  nome: string;
  metaPorHora: number;
}

/** Célula da matriz: quantidade de uma tonalidade dentro de um tamanho. */
export interface TamanhoTonalidade {
  id: string;
  tonalidade: string;
  quantidade: number;
}

export interface Tamanho {
  id: string;
  tamanho: string;
  /** Total do tamanho. Quando o lote tem tonalidades, é a soma das células. */
  quantidade: number;
  /** Células por tonalidade. Vazio quando o lote não tem tonalidades. */
  tonalidades: TamanhoTonalidade[];
}

/** Nome de tonalidade compartilhado pelo lote (coluna da matriz). */
export interface Tonalidade {
  id: string;
  tonalidade: string;
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
  /** Quando true, o lote trabalha com tonalidades (matriz tamanho × tonalidade). */
  temTonalidades: boolean;
  operacoes: Operacao[];
  tamanhos: Tamanho[];
  /** Nomes de tonalidade compartilhados pelo lote (colunas da matriz). */
  tonalidades: Tonalidade[];
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
  temTonalidades: boolean;
  operacoes: Operacao[];
  tamanhos: Tamanho[];
  tonalidades: Tonalidade[];
  createdAt?: string;
  updatedAt?: string;
}
