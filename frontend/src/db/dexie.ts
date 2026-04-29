import Dexie, { type Table } from 'dexie';
import type { LoteLocal } from '../types/lote';
import type { OperarioLocal } from '../types/operario';
import type { AlocacaoLocal } from '../types/alocacao';
import type { PackLocal } from '../types/pack';
import type { AusenciaLocal } from '../types/ausencia';
import type { ConfiguracaoJornadaWire } from '../types/jornada';

export interface JornadaCacheRow {
  id: 'singleton';
  data: ConfiguracaoJornadaWire;
  updatedAt: string;
}

class EzcosturaDb extends Dexie {
  lotes!: Table<LoteLocal, string>;
  operarios!: Table<OperarioLocal, string>;
  alocacoes!: Table<AlocacaoLocal, string>;
  packs!: Table<PackLocal, string>;
  ausencias!: Table<AusenciaLocal, string>;
  jornadaCache!: Table<JornadaCacheRow, 'singleton'>;

  constructor() {
    super('ezcostura');
    this.version(1).stores({
      lotes: 'id, serverId, codigo, syncStatus, updatedAt',
    });
    this.version(2).stores({
      lotes: 'id, serverId, codigo, syncStatus, updatedAt',
      operarios: 'id, serverId, nome, ativo, syncStatus, updatedAt',
      alocacoes: 'id, serverId, operarioId, data, [operarioId+data], syncStatus, updatedAt',
      packs: 'id, serverId, operarioId, alocacaoId, data, [operarioId+data], syncStatus, updatedAt',
    });
    this.version(3).stores({
      lotes: 'id, serverId, codigo, syncStatus, updatedAt',
      operarios: 'id, serverId, nome, ativo, syncStatus, updatedAt',
      alocacoes: 'id, serverId, operarioId, data, [operarioId+data], syncStatus, updatedAt',
      packs: 'id, serverId, operarioId, alocacaoId, data, [operarioId+data], syncStatus, updatedAt',
      ausencias: 'id, serverId, operarioId, dataInicio, dataFim, syncStatus, updatedAt',
      jornadaCache: 'id',
    });
  }
}

export const db = new EzcosturaDb();
