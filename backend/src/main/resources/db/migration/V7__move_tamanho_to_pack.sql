-- Tamanho passa a ser registrado no Pack (Facilitador), não mais na Alocação.
-- Backfill: copia o tamanho da alocação para o pack.

ALTER TABLE packs ADD COLUMN tamanho VARCHAR(32);

UPDATE packs p
SET tamanho = a.tamanho
FROM alocacoes a
WHERE a.id = p.alocacao_id;

ALTER TABLE packs ALTER COLUMN tamanho SET NOT NULL;

ALTER TABLE alocacoes DROP COLUMN tamanho;
