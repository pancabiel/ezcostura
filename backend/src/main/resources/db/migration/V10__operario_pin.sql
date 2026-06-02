-- Portal do operário: autenticação por CPF + PIN no celular do próprio funcionário.
-- pin_hash NULL ⇒ operário não tem acesso ao portal (default).
ALTER TABLE operarios
    ADD COLUMN pin_hash             TEXT,
    ADD COLUMN pin_changed_at       TIMESTAMPTZ,
    ADD COLUMN pin_failed_attempts  INTEGER     NOT NULL DEFAULT 0,
    ADD COLUMN pin_locked_until     TIMESTAMPTZ;

-- Lookup por CPF no login. Parcial porque só operários com PIN ativo logam,
-- e CPF é nullable + não-único no cadastro normal.
CREATE UNIQUE INDEX uq_operarios_cpf_when_pin
    ON operarios(cpf)
    WHERE pin_hash IS NOT NULL;
