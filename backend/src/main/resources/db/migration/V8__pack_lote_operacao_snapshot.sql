-- Pack passa a guardar snapshot de lote/operação para sobreviver à remoção da alocação.
-- O operador limpa a tabela de packs antes de aplicar.

DELETE FROM packs;

ALTER TABLE packs ADD COLUMN lote_id        UUID NOT NULL;
ALTER TABLE packs ADD COLUMN operacao_id    UUID NOT NULL;
ALTER TABLE packs ADD COLUMN lote_codigo    VARCHAR(64)  NOT NULL;
ALTER TABLE packs ADD COLUMN operacao_nome  VARCHAR(255) NOT NULL;

CREATE INDEX idx_packs_lote ON packs(lote_id);

-- Permite remover uma alocação sem violar integridade do histórico de packs.
ALTER TABLE packs DROP CONSTRAINT IF EXISTS packs_alocacao_id_fkey;
