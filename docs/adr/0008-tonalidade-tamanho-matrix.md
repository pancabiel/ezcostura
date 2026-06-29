# 0008. Tonalidade as a tamanho × tonalidade matrix

- **Status:** accepted
- **Date:** 2026-06-29

## Context

A lote tracks how many pieces exist per **tamanho** (size). Some lotes also split
production by **tonalidade** (color/shade). The first cut (the original V14) modeled
tonalidade as a flat per-lote list of `{tonalidade, quantidade}` running *parallel*
to tamanho, with two independent stock limits checked at pack time (one for the size
total, one for the color total). That can't express "how many **Azul P** exist" — the
real shop-floor unit — and the double limit was redundant and confusing.

We need: per-lote opt-in; when on, a quantity per (tamanho, tonalidade); the ability
to know the size total without forcing a color breakdown to be typed twice.

## Decision

Model tonalidade as a **matrix nested inside the lote aggregate**:

- `lotes.tem_tonalidades` (boolean) — explicit opt-in toggle.
- `lote_tonalidades` — the **shared** color names for the lote (name + order only, no
  quantity). These are the matrix columns; they apply to every tamanho.
- `lote_tamanho_tonalidades` — the **cells**: one row per (tamanho, color) with a
  quantity (0 allowed). Child of `lote_tamanhos` (a `@MappedCollection` under
  `Tamanho`), so it lives in the lote aggregate. The cell references its color by
  **name** (string), mirroring how `packs` snapshot the tonalidade string.
- The tamanho **total is the sum of its cells** (derived, not separately editable).
- Pack stock limit is a **single per-cell trava**: lote + operação + tamanho +
  tonalidade. The old size-wide and color-wide limits collapse into it.

The pack row is unchanged — still snapshots `tamanho` + `tonalidade` strings — so
reports needed no change.

## Alternatives considered

- **Keep the flat parallel list with two limits** — rejected: can't express a per-cell
  quantity; the double limit is redundant and confusing.
- **Per-tamanho independent color lists** (each size names its own colors) — rejected:
  redundant re-entry of the same palette; a shared column set with 0-valued cells
  expresses "this size doesn't have that color" just as well and reads as a clean grid.
- **Cells reference the color by FK to `lote_tonalidades.id`** — rejected: that is an FK
  *into an aggregate child table*, the exact delete-reinsert landmine of ADR-0004, and
  would force a `DEFERRABLE` FK. Keying cells by the color **name** keeps the cell FK
  pointed only at `lote_tamanhos` (same aggregate, deleted children-first), needs no
  deferral, and matches the pack's snapshot-by-string approach. A rename rewrites the
  whole aggregate anyway (the frontend re-sends names + cells together).

## Consequences

- The whole color/size structure saves and loads as one lote aggregate; sync carries it
  inside `tamanhos`/`tonalidades` with no new endpoints.
- No FK deferral needed — the only new FK (`lote_tamanho_tonalidades.tamanho_id →
  lote_tamanhos.id`) is internal to the aggregate (see ADR-0004 for the rule).
- The shared name list and the per-tamanho cells are kept consistent by the **frontend**
  (add/rename/remove a color updates every tamanho's cells, index-aligned). The backend
  trusts what it receives; pack creation re-validates the cell exists.
- Color names are denormalized onto each cell, so a rename touches every cell — fine,
  since the aggregate is rewritten on every save.
- V14 was rewritten in place (the feature had never shipped); a local dev DB that ran the
  old V14 needs a Flyway reset/repair.
