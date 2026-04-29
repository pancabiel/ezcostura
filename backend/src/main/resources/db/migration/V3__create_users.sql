CREATE TABLE users (
    id              UUID PRIMARY KEY,
    username        VARCHAR(64)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role            VARCHAR(16)  NOT NULL CHECK (role IN ('ADMIN', 'OPERADOR')),
    ativo           BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Default admin per tenant: admin/admin (bcrypt of "admin").
-- Owner should change this password on first login.
INSERT INTO users (id, username, password_hash, role, ativo)
VALUES (
    gen_random_uuid(),
    'admin',
    '$2a$12$5G2MPC7ahR.kqFHZ9XCTZ.lN65V0VzPwcWjbW6LuGFP82751jReAK',
    'ADMIN',
    TRUE
);
