ALTER TABLE pausas ADD COLUMN tipo VARCHAR(20);

UPDATE pausas SET tipo = 'ALMOCO' WHERE lower(nome) LIKE '%almo%';
UPDATE pausas SET tipo = 'CAFE'   WHERE lower(nome) LIKE '%caf%';
UPDATE pausas SET tipo = 'OUTRO'  WHERE tipo IS NULL;

ALTER TABLE pausas ALTER COLUMN tipo SET NOT NULL;
ALTER TABLE pausas ADD CONSTRAINT pausas_tipo_check
    CHECK (tipo IN ('ALMOCO', 'CAFE', 'OUTRO'));
