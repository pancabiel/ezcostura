import type { SyncStatus } from './lote';

export type TipoPausa = 'ALMOCO' | 'CAFE' | 'OUTRO';

/** 0 = domingo .. 6 = sábado. */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface PausaWire {
  id?: string;
  nome: string;
  horaInicio: string; // HH:mm or HH:mm:ss
  horaFim: string;
  tipo: TipoPausa;
  /** null = pausa padrão; 0..6 = override desse dia da semana. */
  diaSemana: DiaSemana | null;
}

export interface DiaSemanaOverrideWire {
  id?: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
}

export interface JornadaWire {
  id: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
  pausas: PausaWire[];
  diasSemana: DiaSemanaOverrideWire[];
  updatedAt?: string;
}

export interface JornadaLocal {
  id: string;
  serverId?: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
  pausas: PausaWire[];
  diasSemana: DiaSemanaOverrideWire[];
  syncStatus: SyncStatus;
  updatedAt: string;
  syncError?: string;
  pendingDelete?: boolean;
}

export interface DiaEspecialPausaWire {
  id?: string;
  nome: string;
  horaInicio: string;
  horaFim: string;
  tipo: TipoPausa;
}

export interface DiaEspecialWire {
  id: string;
  data: string; // ISO date
  descricao?: string;
  horaInicio: string;
  horaFim: string;
  pausas: DiaEspecialPausaWire[];
  operarioIds: string[];
  updatedAt?: string;
}

export interface DiaEspecialLocal {
  id: string;
  serverId?: string;
  data: string;
  descricao?: string;
  horaInicio: string;
  horaFim: string;
  pausas: DiaEspecialPausaWire[];
  /** Sempre IDs locais (resolvidos do serverId quando vem do backend). */
  operarioIds: string[];
  syncStatus: SyncStatus;
  updatedAt: string;
  syncError?: string;
  pendingDelete?: boolean;
}

/** Jornada efetiva resolvida para um operário em uma data específica. */
export interface JornadaEfetiva {
  horaInicio: string;
  horaFim: string;
  pausas: { nome: string; horaInicio: string; horaFim: string; tipo: TipoPausa }[];
  origem: 'padrao' | 'dia-semana' | 'dia-especial';
}
