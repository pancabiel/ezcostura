-- Novos papéis de login: GERENTE (tudo menos gestão de usuários) e SUPERVISOR
-- (facilitador + relatórios). O CHECK original (V3) só permitia ADMIN/OPERADOR.
ALTER TABLE users DROP CONSTRAINT users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
    CHECK (role IN ('ADMIN', 'GERENTE', 'SUPERVISOR', 'OPERADOR'));
