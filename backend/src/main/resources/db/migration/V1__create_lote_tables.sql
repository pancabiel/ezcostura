CREATE TABLE lotes (
    id          UUID PRIMARY KEY,
    codigo      VARCHAR(64)  NOT NULL UNIQUE,
    nome        VARCHAR(255) NOT NULL,
    descricao   TEXT,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE lote_operacoes (
    id            UUID PRIMARY KEY,
    lote_id       UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    nome          VARCHAR(255) NOT NULL,
    meta_por_hora INTEGER NOT NULL CHECK (meta_por_hora > 0),
    ordem         INTEGER NOT NULL
);

CREATE INDEX idx_lote_operacoes_lote ON lote_operacoes(lote_id);

CREATE TABLE lote_tamanhos (
    id          UUID PRIMARY KEY,
    lote_id     UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    tamanho     VARCHAR(32) NOT NULL,
    quantidade  INTEGER NOT NULL CHECK (quantidade >= 0),
    ordem       INTEGER NOT NULL
);

CREATE INDEX idx_lote_tamanhos_lote ON lote_tamanhos(lote_id);
