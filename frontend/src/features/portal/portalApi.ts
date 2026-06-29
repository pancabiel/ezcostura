import axios from 'axios';
import { portalApi } from '../../lib/portalAxios';

export interface DesempenhoItem {
  alocacaoId: string;
  loteId: string;
  loteCodigo: string | null;
  operacaoId: string;
  operacaoNome: string | null;
  metaPorHora: number;
  horarioInicio: string;
  horas: number;
  meta: number;
  produzido: number;
  pct: number;
}

export interface DesempenhoDia {
  data: string;
  ausente: boolean;
  jornadaOrigem: 'PADRAO' | 'DIA_SEMANA' | 'DIA_ESPECIAL' | 'DEFAULT';
  horaInicio: string;
  horaFim: string;
  itens: DesempenhoItem[];
  totalMeta: number;
  totalProduzido: number;
  totalPct: number;
}

export interface DesempenhoPeriodo {
  inicio: string;
  fim: string;
  dias: DesempenhoDia[];
  totalMeta: number;
  totalProduzido: number;
  totalPct: number;
}

export interface Perfil {
  operarioId: string;
  nome: string;
  cpfMascarado: string;
  dataAdmissao: string;
  jornadaNome: string | null;
}

/** Um pack individual do próprio operário (self-view: conferir horário + quantidade). */
export interface MeuPack {
  id: string;
  horario: string; // ISO timestamp
  alocacaoId: string;
  operacaoId: string;
  operacaoNome: string | null;
  loteCodigo: string | null;
  tamanho: string;
  tonalidade: string | null;
  quantidade: number;
}

export const portalAuth = {
  async login(tenantId: string, cpf: string, pin: string) {
    const { data } = await axios.post('/api/auth/operario/login', { tenantId, cpf, pin });
    return data as {
      accessToken: string;
      refreshToken: string;
      operarioId: string;
      nome: string;
      tenantId: string;
      role: string;
    };
  },
};

export const meApi = {
  async perfil() {
    const { data } = await portalApi.get<Perfil>('/me/perfil');
    return data;
  },
  async hoje() {
    const { data } = await portalApi.get<DesempenhoDia>('/me/hoje');
    return data;
  },
  async periodo(inicio: string, fim: string) {
    const { data } = await portalApi.get<DesempenhoPeriodo>('/me/periodo', {
      params: { inicio, fim },
    });
    return data;
  },
  async packs(data: string) {
    const { data: packs } = await portalApi.get<MeuPack[]>('/me/packs', {
      params: { data },
    });
    return packs;
  },
  async changePin(currentPin: string, newPin: string) {
    await portalApi.post('/auth/operario/change-pin', { currentPin, newPin });
  },
};
