-- Spring Data JDBC reescreve lote_operacoes (DELETE + reinsert) a cada save do
-- agregado Lote, mesmo quando os IDs não mudam. Com o FK não-deferível,
-- alocacoes.operacao_id bloqueia o passo intermediário de DELETE.
-- Tornar o FK DEFERRABLE INITIALLY DEFERRED faz o Postgres validar a
-- integridade no COMMIT: se ninguém remover de fato uma operação alocada,
-- a transação encerra com tudo coerente.

ALTER TABLE alocacoes DROP CONSTRAINT alocacoes_operacao_id_fkey;

ALTER TABLE alocacoes
    ADD CONSTRAINT alocacoes_operacao_id_fkey
    FOREIGN KEY (operacao_id) REFERENCES lote_operacoes(id)
    DEFERRABLE INITIALLY DEFERRED;
