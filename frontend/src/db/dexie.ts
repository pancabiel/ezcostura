import Dexie, { type Table } from 'dexie';
import type { LoteLocal } from '../types/lote';
import type { OperarioLocal } from '../types/operario';
import type { AlocacaoLocal } from '../types/alocacao';
import type { PackLocal } from '../types/pack';
import type { AusenciaLocal } from '../types/ausencia';
import type { JornadaLocal, DiaEspecialLocal } from '../types/jornada';

class EzcosturaDb extends Dexie {
  lotes!: Table<LoteLocal, string>;
  operarios!: Table<OperarioLocal, string>;
  alocacoes!: Table<AlocacaoLocal, string>;
  packs!: Table<PackLocal, string>;
  ausencias!: Table<AusenciaLocal, string>;
  jornadas!: Table<JornadaLocal, string>;
  diasEspeciais!: Table<DiaEspecialLocal, string>;

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
    this.version(4)
      .stores({
        lotes: 'id, serverId, codigo, syncStatus, updatedAt',
        operarios: 'id, serverId, nome, ativo, jornadaId, syncStatus, updatedAt',
        alocacoes: 'id, serverId, operarioId, data, [operarioId+data], syncStatus, updatedAt',
        packs: 'id, serverId, operarioId, alocacaoId, data, [operarioId+data], syncStatus, updatedAt',
        ausencias: 'id, serverId, operarioId, dataInicio, dataFim, syncStatus, updatedAt',
        jornadas: 'id, serverId, nome, syncStatus, updatedAt',
        diasEspeciais: 'id, serverId, data, syncStatus, updatedAt',
        jornadaCache: null, // drop legacy singleton cache
      })
      .upgrade(async () => {
        // Local data will be re-pulled from backend on next sync.
        // No in-place data migration is required for cached records.
      });
  }
}

export const db = new EzcosturaDb();
