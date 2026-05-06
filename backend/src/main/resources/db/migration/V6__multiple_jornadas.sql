-- Múltiplas jornadas de trabalho, com overrides por dia da semana e dias especiais.

CREATE TABLE jornadas (
    id           UUID PRIMARY KEY,
    nome         VARCHAR(80) NOT NULL,
    hora_inicio  TIME NOT NULL,
    hora_fim     TIME NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (hora_fim > hora_inicio)
);

-- pausas now belongs to a jornada (and optionally a dia_semana override).
ALTER TABLE pausas ADD COLUMN jornada_id UUID;
ALTER TABLE pausas ADD COLUMN dia_semana INTEGER CHECK (dia_semana BETWEEN 0 AND 6);
-- 0 = domingo .. 6 = sábado.

-- Backfill: turn the singleton config into the default jornada.
INSERT INTO jornadas (id, nome, hora_inicio, hora_fim)
SELECT '00000000-0000-0000-0000-000000000001'::UUID, 'Padrão', hora_inicio, hora_fim
FROM configuracao_jornada
WHERE id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;

-- Re-attach existing pausas to the default jornada.
UPDATE pausas SET jornada_id = '00000000-0000-0000-0000-000000000001'
WHERE configuracao_id = '00000000-0000-0000-0000-000000000001';

ALTER TABLE pausas ALTER COLUMN jornada_id SET NOT NULL;
ALTER TABLE pausas ADD CONSTRAINT fk_pausas_jornada
    FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE;
ALTER TABLE pausas DROP CONSTRAINT pausas_configuracao_id_fkey;
ALTER TABLE pausas DROP COLUMN configuracao_id;

CREATE INDEX idx_pausas_jornada ON pausas(jornada_id);

-- Drop the old singleton table; the new model is canonical.
DROP TABLE configuracao_jornada;

-- Override de horário por dia da semana, dentro da jornada.
CREATE TABLE jornada_dia_semana (
    id           UUID PRIMARY KEY,
    jornada_id   UUID NOT NULL REFERENCES jornadas(id) ON DELETE CASCADE,
    dia_semana   INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio  TIME NOT NULL,
    hora_fim     TIME NOT NULL,
    UNIQUE (jornada_id, dia_semana),
    CHECK (hora_fim > hora_inicio)
);

CREATE INDEX idx_jornada_dia_semana_jornada ON jornada_dia_semana(jornada_id);

-- Dia especial: data específica que substitui o horário e pode ter pausas próprias,
-- válida apenas para o conjunto de operários selecionados.
CREATE TABLE dias_especiais (
    id           UUID PRIMARY KEY,
    data         DATE NOT NULL,
    descricao    VARCHAR(120),
    hora_inicio  TIME NOT NULL,
    hora_fim     TIME NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (hora_fim > hora_inicio)
);

CREATE INDEX idx_dias_especiais_data ON dias_especiais(data);

CREATE TABLE dia_especial_pausas (
    id                UUID PRIMARY KEY,
    dia_especial_id   UUID NOT NULL REFERENCES dias_especiais(id) ON DELETE CASCADE,
    nome              VARCHAR(50) NOT NULL,
    hora_inicio       TIME NOT NULL,
    hora_fim          TIME NOT NULL,
    tipo              VARCHAR(20) NOT NULL CHECK (tipo IN ('ALMOCO', 'CAFE', 'OUTRO')),
    ordem             INTEGER NOT NULL,
    CHECK (hora_fim > hora_inicio)
);

CREATE INDEX idx_dia_especial_pausas_dia ON dia_especial_pausas(dia_especial_id);

CREATE TABLE dia_especial_operarios (
    id               UUID PRIMARY KEY,
    dia_especial_id  UUID NOT NULL REFERENCES dias_especiais(id) ON DELETE CASCADE,
    operario_id      UUID NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
    UNIQUE (dia_especial_id, operario_id)
);

CREATE INDEX idx_dia_especial_operarios_dia ON dia_especial_operarios(dia_especial_id);
CREATE INDEX idx_dia_especial_operarios_operario ON dia_especial_operarios(operario_id);

-- Operário precisa apontar para uma jornada.
ALTER TABLE operarios ADD COLUMN jornada_id UUID;
UPDATE operarios SET jornada_id = '00000000-0000-0000-0000-000000000001';
ALTER TABLE operarios ALTER COLUMN jornada_id SET NOT NULL;
ALTER TABLE operarios ADD CONSTRAINT fk_operarios_jornada
    FOREIGN KEY (jornada_id) REFERENCES jornadas(id);
