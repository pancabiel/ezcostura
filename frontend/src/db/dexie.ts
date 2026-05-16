import Dexie, { type Table } from 'dexie';
import type { LoteLocal } from '../types/lote';
import type { OperarioLocal } from '../types/operario';
import type { AlocacaoLocal } from '../types/alocacao';
import type { PackLocal } from '../types/pack';
import type { AusenciaLocal } from '../types/ausencia';
import type { JornadaLocal, DiaEspecialLocal } from '../types/jornada';
import { getSession } from '../stores/authStore';

export class EzcosturaDb extends Dexie {
  lotes!: Table<LoteLocal, string>;
  operarios!: Table<OperarioLocal, string>;
  alocacoes!: Table<AlocacaoLocal, string>;
  packs!: Table<PackLocal, string>;
  ausencias!: Table<AusenciaLocal, string>;
  jornadas!: Table<JornadaLocal, string>;
  diasEspeciais!: Table<DiaEspecialLocal, string>;

  constructor(name: string) {
    super(name);
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

const instances = new Map<string, EzcosturaDb>();

function dbNameFor(tenantId: string): string {
  return `ezcostura_${tenantId.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()}`;
}

// Pre-multi-tenant builds stored everything in a single `ezcostura` database,
// which leaked data between tenants on the same browser. Delete it on first
// load so the orphan doesn't linger.
if (typeof indexedDB !== 'undefined') {
  void Dexie.delete('ezcostura').catch(() => undefined);
}

// Each tenant gets its own IndexedDB database, so data cannot leak when the
// same browser is used to log into different tenants in sequence.
export function getDb(): EzcosturaDb {
  const tenantId = getSession()?.tenantId;
  if (!tenantId) {
    throw new Error('getDb() called without an active session');
  }
  let inst = instances.get(tenantId);
  if (!inst) {
    inst = new EzcosturaDb(dbNameFor(tenantId));
    instances.set(tenantId, inst);
  }
  return inst;
}

export function hasDbForCurrentSession(): boolean {
  return !!getSession()?.tenantId;
}
