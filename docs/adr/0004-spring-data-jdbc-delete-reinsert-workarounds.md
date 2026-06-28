# 0004. Working around the Spring Data JDBC delete-reinsert quirk

- **Status:** accepted
- **Date:** 2026-06-28

## Context

Spring Data JDBC saves an aggregate with `@MappedCollection` children by
**deleting and reinserting all child rows** — even when the child ids are
unchanged. Any foreign key pointing *into* a child table blocks the intermediate
DELETE step, breaking the save.

Two relationships ran into this, and they are **not the same problem**:

1. `alocacoes.operacao_id → lote_operacoes.id` — the lote aggregate rewrites
   `lote_operacoes` on every save (same ids reinserted). The live FK from
   `alocacoes` blocks the DELETE. Nobody is actually removing an allocated
   operation — it's a **phantom delete**.
2. `packs.alocacao_id → alocacoes.id` — packs are permanent production history,
   but allocations genuinely get deleted. Keeping the FK means you cannot delete
   an allocation without destroying (or being blocked by) its pack history. This
   is a **real, intended, cross-transaction delete**.

## Decision

Use **different fixes matched to the kind of delete:**

- **Phantom delete → make the FK deferrable.** V9 redefines
  `alocacoes_operacao_id_fkey` as `DEFERRABLE INITIALLY DEFERRED`, so Postgres
  validates integrity at COMMIT. The transaction ends consistent.
- **Real delete → drop the FK and snapshot.** V8 drops
  `packs_alocacao_id_fkey` and adds `lote_id`, `operacao_id`, `lote_codigo`,
  `operacao_nome` columns onto `packs`, making each pack self-contained.
  `PackService.create` populates these from the lote server-side (ignoring
  client-derived values).

## Alternatives considered

- **Deferrable FK for packs too** — does not work. Deferral only rescues a
  delete-then-reinsert *within a single transaction*; deleting an allocation is a
  permanent delete across transactions, so there is nothing to defer.
- **Stop using `@MappedCollection` aggregates** — larger rewrite of the data
  layer; not worth it for two localized FK conflicts.

## Consequences

- The rule to remember: **deferral for phantom deletes, snapshot for real
  deletes.** Future FKs into aggregate child tables must be classified the same
  way.
- Packs no longer have referential integrity to allocations at the DB level —
  intentional. Their correctness depends on `PackService.create` snapshotting the
  right values; client values are not trusted.
- V8 required clearing the `packs` table on deploy (data loss accepted at that
  early stage).
