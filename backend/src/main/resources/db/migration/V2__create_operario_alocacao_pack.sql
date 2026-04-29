CREATE TABLE operarios (
    id              UUID PRIMARY KEY,
    nome            VARCHAR(255) NOT NULL,
    cpf             VARCHAR(20),
    telefone        VARCHAR(30),
    data_admissao   DATE NOT NULL,
    ativo           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operarios_ativo ON operarios(ativo);

CREATE TABLE alocacoes (
    id              UUID PRIMARY KEY,
    operario_id     UUID NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
    data            DATE NOT NULL,
    horario_inicio  TIME NOT NULL,
    lote_id         UUID NOT NULL REFERENCES lotes(id),
    tamanho         VARCHAR(32) NOT NULL,
    operacao_id     UUID NOT NULL REFERENCES lote_operacoes(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_alocacoes_operario_data ON alocacoes(operario_id, data, horario_inicio);
CREATE INDEX idx_alocacoes_data ON alocacoes(data);

CREATE TABLE packs (
    id              UUID PRIMARY KEY,
    operario_id     UUID NOT NULL REFERENCES operarios(id),
    data            DATE NOT NULL,
    horario         TIMESTAMPTZ NOT NULL,
    alocacao_id     UUID NOT NULL REFERENCES alocacoes(id),
    quantidade      INTEGER NOT NULL CHECK (quantidade > 0),
    registrado_por  UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_packs_operario_data ON packs(operario_id, data);
CREATE INDEX idx_packs_alocacao ON packs(alocacao_id);
CREATE INDEX idx_packs_data ON packs(data);
