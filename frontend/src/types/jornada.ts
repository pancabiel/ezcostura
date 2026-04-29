export type TipoPausa = 'ALMOCO' | 'CAFE' | 'OUTRO';

export interface PausaWire {
  id?: string;
  nome: string;
  horaInicio: string; // HH:mm or HH:mm:ss
  horaFim: string;
  tipo: TipoPausa;
}

export interface ConfiguracaoJornadaWire {
  id?: string;
  horaInicio: string;
  horaFim: string;
  pausas: PausaWire[];
  updatedAt?: string;
}
