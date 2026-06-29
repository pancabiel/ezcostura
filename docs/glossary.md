# Glossary

Domain terms used throughout the code and UI. Code and database keep the
**Portuguese** names; this maps them to plain English meaning.

Terms verified against the code. Correct anything that drifts from how you
actually use the word on the shop floor.

| Term (PT) | Meaning |
| --------- | ------- |
| **lote** | A batch/order of garments to be produced. Has dynamic operations and sizes. |
| **operário** | A shop-floor operator who sews and registers finished work. |
| **operação** | A single operation/step within a lote (e.g. a specific seam). |
| **tamanho** | Size of a garment (P/M/G…); since V7 recorded on the pack. |
| **tonalidade** | Color/shade of a garment (e.g. Azul/Verde). A lote either works with tonalidades or not (`temTonalidades` flag, V14). When it does, it carries a shared list of color names and a **tamanho × tonalidade matrix**: each tamanho holds a per-color quantity (cell, 0 allowed), and the tamanho total is the sum of its cells. Recorded on the pack; the per-cell quantity is the per-operação stock limit. |
| **pack** | A registered bundle of finished pieces for a given lote operation + size. The core production record. |
| **alocação** | An allocation: assigning an operário to work on something for a given day. |
| **jornada** | A work-shift schedule (hours/pauses), can have weekday overrides. |
| **ausência** | An absence — operário not working on a given day. |
| **dia especial** | A specific calendar date with its own work hours + pauses that override the normal jornada (e.g. holiday, half-day, special shift). Can be scoped to specific operários. Resolution order: dia especial → weekday override → default jornada. |
| **facilitador** | The shop-floor tablet screen for registering a pack in ≤3 taps. |
| **gerenciador** | The daily planner screen — per-operator allocations. |
| **relatório** | Report: per-operator and per-batch production totals over a period. |
| **desempenho** | Performance — an operário's output metrics over a period, computed by `DesempenhoService` against the resolved effective schedule (`JornadaEfetiva`). Shown in reports and in the operário portal. |
| **portal** | The operário-facing area (CPF + PIN login, `OPERARIO_SELF` role) where an operator sees only their own desempenho per week/period. |
| **tenant** | One factory/customer; isolated in its own Postgres schema (`tenant_<id>`). |
| **CPF** | Brazilian taxpayer ID; the operário's login identifier for the portal. |
| **PIN** | Short numeric code an operário uses (with their CPF) to log into the portal. |

## Roles

| Role | Meaning |
| ---- | ------- |
| **ADMIN** | Full access to the admin app, including user management (the sole owner account). |
| **GERENTE** | Manager: everything ADMIN can do **except** managing users. |
| **SUPERVISOR** | Shift supervisor: the facilitador screen **plus** reports, nothing else. |
| **OPERADOR** | Shop-floor screen only (facilitador). |
| **OPERARIO_SELF** | An operário authenticated via the portal, seeing only their own data. |
