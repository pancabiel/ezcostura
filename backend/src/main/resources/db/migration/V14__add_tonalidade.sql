-- Tonalidades do lote: matriz tamanho × tonalidade.
-- Um lote pode ou não trabalhar com tonalidades (flag tem_tonalidades). Quando
-- trabalha, define uma lista compartilhada de nomes de cor (lote_tonalidades) e a
-- quantidade de cada cor em cada tamanho fica nas células (lote_tamanho_tonalidades).
-- O total de um tamanho é a soma das suas células.
ALTER TABLE lotes ADD COLUMN tem_tonalidades BOOLEAN NOT NULL DEFAULT false;

-- Nomes de tonalidade compartilhados pelo lote (só o rótulo/ordem, sem quantidade).
CREATE TABLE lote_tonalidades (
    id          UUID PRIMARY KEY,
    lote_id     UUID NOT NULL REFERENCES lotes(id) ON DELETE CASCADE,
    tonalidade  VARCHAR(32) NOT NULL,
    ordem       INTEGER NOT NULL
);

CREATE INDEX idx_lote_tonalidades_lote ON lote_tonalidades(lote_id);

-- Célula da matriz: quantidade de uma tonalidade dentro de um tamanho.
-- Referencia a tonalidade pelo nome (string), espelhando o snapshot que o pack guarda.
-- FK só para lote_tamanhos (mesmo agregado do lote) — sem FK externa, dispensa deferral.
CREATE TABLE lote_tamanho_tonalidades (
    id          UUID PRIMARY KEY,
    tamanho_id  UUID NOT NULL REFERENCES lote_tamanhos(id) ON DELETE CASCADE,
    tonalidade  VARCHAR(32) NOT NULL,
    quantidade  INTEGER NOT NULL CHECK (quantidade >= 0),
    ordem       INTEGER NOT NULL
);

CREATE INDEX idx_lote_tam_ton_tamanho ON lote_tamanho_tonalidades(tamanho_id);

-- Tonalidade escolhida no registro do pack. Nullable: lotes sem tonalidade,
-- e packs já registrados antes desta migração, ficam com NULL.
ALTER TABLE packs ADD COLUMN tonalidade VARCHAR(32);
