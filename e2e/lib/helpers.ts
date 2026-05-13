import { expect, Page, request, APIRequestContext } from '@playwright/test';

export const TENANT = process.env.E2E_TENANT ?? 'demo';
export const USER = process.env.E2E_USER ?? 'admin';
export const PASS = process.env.E2E_PASS ?? 'admin';
export const BACKEND = process.env.E2E_BACKEND ?? 'http://localhost:8080';
export const FRONTEND = process.env.E2E_FRONTEND ?? 'http://localhost:5173';

// Unique tag stamped onto every entity created by one run.
// Lets you find/clean up test data later (`[E2E-...]` prefix).
export const RUN_TAG = `E2E-${Date.now().toString(36)}`;

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Facção (tenant)').fill(TENANT);
  await page.getByLabel('Usuário').fill(USER);
  await page.getByLabel('Senha').fill(PASS);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/\/facilitador$/, { timeout: 10_000 });
}

/**
 * Wait until Dexie has zero rows in non-synced states across all sync-aware
 * tables. We can't trust the SyncStatusBadge alone — its "Sincronizado" label
 * reflects the last completed cycle, not rows added since. The 5s sync timer
 * means up to ~12s wait per cycle in the worst case.
 *
 * Also surfaces any rows stuck in `syncStatus: 'error'` — those are silent
 * push failures (the badge would not flag them).
 */
export async function waitForSync(page: Page, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastSummary = '';
  while (Date.now() < deadline) {
    const summary = await page.evaluate(async () => {
      const open = (name: string) =>
        new Promise<IDBDatabase>((resolve, reject) => {
          const r = indexedDB.open(name);
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        });
      const dbs = await indexedDB.databases();
      const meta = dbs.find((d) => d.name === 'ezcostura');
      if (!meta?.name) return { ready: true, pending: 0, errors: [] };
      const db = await open(meta.name);
      const counts: Record<string, { pending: number; error: number; errorRows: any[] }> = {};
      const tables = ['jornadas', 'operarios', 'lotes', 'diasEspeciais', 'alocacoes', 'packs', 'ausencias'];
      for (const t of tables) {
        if (!db.objectStoreNames.contains(t)) continue;
        const rows: any[] = await new Promise((resolve) => {
          const req = db.transaction(t, 'readonly').objectStore(t).getAll();
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve([]);
        });
        const pending = rows.filter((r) => r.syncStatus === 'pending').length;
        const errs = rows.filter((r) => r.syncStatus === 'error');
        counts[t] = { pending, error: errs.length, errorRows: errs.map((r) => ({ id: r.id, nome: r.nome ?? r.codigo ?? r.descricao, syncError: r.syncError })) };
      }
      const totalPending = Object.values(counts).reduce((s, c) => s + c.pending, 0);
      const totalError = Object.values(counts).reduce((s, c) => s + c.error, 0);
      return { ready: totalPending === 0 && totalError === 0, pending: totalPending, error: totalError, counts };
    });
    if (summary.ready) return;
    lastSummary = JSON.stringify(summary, null, 2);
    if (summary.error > 0) {
      // Don't keep waiting — surface the failure with detail.
      throw new Error(`Sync push failed for ${summary.error} row(s):\n${lastSummary}`);
    }
    await page.waitForTimeout(500);
  }
  throw new Error(`Sync did not settle within ${timeoutMs}ms — last Dexie state:\n${lastSummary}`);
}

export async function loginApi(req: APIRequestContext): Promise<string> {
  const res = await req.post(`${BACKEND}/api/auth/login`, {
    data: { tenantId: TENANT, username: USER, password: PASS },
  });
  expect(res.ok(), 'API login failed').toBeTruthy();
  const body = await res.json();
  return body.accessToken;
}

export async function apiClient(): Promise<{ req: APIRequestContext; token: string }> {
  const req = await request.newContext({ baseURL: BACKEND });
  const token = await loginApi(req);
  return { req, token };
}

export function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

/**
 * Robust fill that survives React's hydration/auto-focus race.
 * Plain `fill()` sometimes drops the first few characters in Firefox when an
 * input is auto-focused on mount. Click → clear → fill → verify fixes that.
 */
export async function safeFill(loc: import('@playwright/test').Locator, value: string) {
  await loc.waitFor({ state: 'visible' });
  await loc.click();
  await loc.fill('');
  await loc.fill(value);
  // Verify it actually took.
  const actual = await loc.inputValue();
  if (actual !== value) {
    // Retry once with pressSequentially as fallback.
    await loc.fill('');
    await loc.pressSequentially(value, { delay: 5 });
    const actual2 = await loc.inputValue();
    if (actual2 !== value) {
      throw new Error(`safeFill failed: expected "${value}", got "${actual2}"`);
    }
  }
}
