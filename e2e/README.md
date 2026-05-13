# ezcostura — End-to-end tests

Playwright + Firefox driving the real running stack. **No Chrome required.**

## Prerequisites (must be running)

```powershell
# 1. Postgres
docker compose up -d postgres
# 2. Backend
cd backend ; mvn spring-boot:run
# 3. Frontend dev server
cd frontend ; npm run dev
```

The tests log in as `demo` / `admin` / `admin` (override via env vars below).

## Run

From `e2e/`:

| Command | What it does |
| --- | --- |
| `npm test` | All specs |
| `npm run test:smoke` | Quick: login + visit every admin route + check no JS errors (~5s) |
| `npm run test:full` | Comprehensive: jornada (with Friday short hours) → operário → dia especial → lote with operações + tamanhos → register pack → verify report (~30–60s) |
| `npm run test:headed` | Same, but with the browser visible — handy for debugging |
| `npm run test:debug` | Step through with the Playwright Inspector |
| `npm run report` | Open the last HTML report |

## What the full flow checks

1. **Jornada** — created with default 07:00–17:00 + lunch 12:00–13:00, plus a **Friday override** (07:00–13:00).
2. **Operário** — Maria, tied to that jornada.
3. **Dia especial** — half-day applied to Maria, two days from now.
4. **Lote** — code, two operações (Costura @60/h, Acabamento @40/h), three tamanhos (P, M, G).
5. **Sync to backend** — waits for the badge to read `Sincronizado`, then verifies all four entities via the REST API (`GET /api/jornadas`, `/api/operarios`, `/api/lotes`, `/api/dias-especiais`).
6. **Pack registration** — opens Maria's card on `/facilitador`, picks lote/operação/size, writes `30` pieces. Verifies the count appears on the card.
7. **Sync + API verify** — `GET /api/packs?data=today` contains the pack with the right quantity, operação, size, and a matching auto-created alocação.
8. **Relatórios** — the page hits `/api/relatorios/producao-operario-dia`, the "Total de peças" KPI is ≥ 30, Maria appears in top operários, and the "Detalhe do dia" row shows our lote/operação with `30 / N` pieces.
9. **No console / page errors** — fails the test if any uncaught exception or `console.error` fired during the walk.

Every entity is stamped with a unique `[E2E-<base36-timestamp>]` prefix so reruns don't collide. Test data is **not** cleaned up — search by the prefix in the UI to spot it.

## Env overrides

```powershell
$env:E2E_TENANT = "demo"        # default
$env:E2E_USER   = "admin"
$env:E2E_PASS   = "admin"
$env:E2E_BACKEND  = "http://localhost:8080"
$env:E2E_FRONTEND = "http://localhost:5173"
npm test
```

## Files

```
e2e/
├── lib/helpers.ts          login, RUN_TAG, sync waiter, API client
├── tests/
│   ├── smoke.spec.ts       login + every admin route + error scrubber
│   └── full-flow.spec.ts   the comprehensive production walkthrough
├── playwright.config.ts    Firefox-only project, baseURL :5173
└── screenshots/            artefacts from runs (gitignored — not under git)
```

## Asking Claude to run it

> "Run the full E2E flow." — Claude `cd`s into `e2e/`, runs `npm run test:full`, reports the result, and shows screenshots/traces if anything fails.
