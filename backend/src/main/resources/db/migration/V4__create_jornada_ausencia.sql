CREATE TABLE configuracao_jornada (
    id           UUID PRIMARY KEY,
    hora_inicio  TIME NOT NULL,
    hora_fim     TIME NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (hora_fim > hora_inicio)
);

CREATE TABLE pausas (
    id                 UUID PRIMARY KEY,
    configuracao_id    UUID NOT NULL REFERENCES configuracao_jornada(id) ON DELETE CASCADE,
    nome               VARCHAR(50) NOT NULL,
    hora_inicio        TIME NOT NULL,
    hora_fim           TIME NOT NULL,
    ordem              INTEGER NOT NULL,
    CHECK (hora_fim > hora_inicio)
);

CREATE INDEX idx_pausas_configuracao ON pausas(configuracao_id);

INSERT INTO configuracao_jornada (id, hora_inicio, hora_fim)
VALUES ('00000000-0000-0000-0000-000000000001', '07:00', '17:00');

INSERT INTO pausas (id, configuracao_id, nome, hora_inicio, hora_fim, ordem) VALUES
    ('00000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Café manhã', '09:30', '09:45', 0),
    ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Almoço',     '12:00', '13:00', 1),
    ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Café tarde', '15:00', '15:15', 2);

CREATE TABLE ausencias (
    id            UUID PRIMARY KEY,
    operario_id   UUID NOT NULL REFERENCES operarios(id) ON DELETE CASCADE,
    data_inicio   DATE NOT NULL,
    data_fim      DATE NOT NULL,
    tipo          VARCHAR(20) NOT NULL,
    observacao    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by    UUID,
    CHECK (data_fim >= data_inicio),
    CHECK (tipo IN ('ATESTADO', 'FALTA', 'FERIAS', 'FOLGA'))
);

CREATE INDEX idx_ausencias_operario_periodo ON ausencias(operario_id, data_inicio, data_fim);
CREATE INDEX idx_ausencias_periodo ON ausencias(data_inicio, data_fim);
