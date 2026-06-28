/**
 * Full production-flow E2E. Drives the real UI in Firefox against the running
 * backend + Postgres + frontend dev server.
 *
 * Each step uses `test.step()` so the report tells you exactly where it broke.
 * One single test() so Dexie/IndexedDB state survives the whole chain.
 *
 * All entities are stamped with a unique `RUN_TAG` so reruns don't collide.
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import {
  apiClient,
  authHeaders,
  login,
  RUN_TAG,
  safeFill,
  selectRadix,
  todayISO,
  waitForSync,
} from '../lib/helpers';

// Fail-fast on uncaught page errors anywhere in the flow.
test.describe.configure({ mode: 'serial' });

const tag = RUN_TAG;
const jornadaNome = `${tag} Padrão+Sex curta`;
const operarioNome = `${tag} Maria Teste`;
const loteCodigo = `${tag}-L1`;
const loteNome = `${tag} Camiseta básica`;
const operacaoCostura = `${tag} Costura`;
const operacaoAcabamento = `${tag} Acabamento`;
const diaEspecialDescricao = `${tag} Véspera de feriado`;
const META_COSTURA_POR_HORA = 60;
const META_ACABAMENTO_POR_HORA = 40;
const QTD_PACK = 30;
const TAMANHO_PACK = 'M';

// Pick a "future-but-soon" date for the dia especial so it doesn't collide
// with today's test data. Day-after-tomorrow is safe.
const diaEspecialData = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 2);
  return d.toISOString().slice(0, 10);
})();

test('full production flow: jornada → operário → dia especial → lote → pack → relatório', async ({ page }) => {
  test.setTimeout(180_000);

  console.log(`[E2E] RUN_TAG = ${tag}`);
  console.log(`[E2E] operarioNome = ${operarioNome}`);
  console.log(`[E2E] jornadaNome = ${jornadaNome}`);
  console.log(`[E2E] loteCodigo = ${loteCodigo}`);

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.stack ?? e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  await test.step('login as admin', async () => {
    await login(page);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/full-01-login.png', fullPage: true });
  });

  // ---------------------------------------------------------------------------
  // 1. JORNADA — Mon-Thu 07:00-17:00 with lunch, Fri override 07:00-13:00
  // ---------------------------------------------------------------------------
  await test.step('create jornada with Friday short hours', async () => {
    await page.getByRole('link', { name: 'Jornadas' }).click();
    await page.waitForURL(/\/configuracoes\/jornada$/);
    await page.getByRole('link', { name: '+ Nova jornada' }).click();
    await page.waitForURL(/\/configuracoes\/jornada\/nova$/);

    await safeFill(page.getByLabel('Nome'), jornadaNome);
    // Default times 07:00–17:00 are fine.

    // Add a default lunch break at 12:00–13:00.
    await page.getByRole('button', { name: '+ Adicionar pausa' }).first().click();
    // Locate the just-added pausa row — it's the only one in "Pausas (padrão)".
    const pausasSection = page.locator('section', { has: page.getByRole('heading', { name: 'Pausas (padrão)' }) });
    const pausaRow = pausasSection.locator('li').first();
    await selectRadix(page, pausaRow.getByRole('combobox', { name: 'Tipo de pausa' }), 'Almoço');
    await pausaRow.locator('input[type="time"]').nth(0).fill('12:00');
    await pausaRow.locator('input[type="time"]').nth(1).fill('13:00');

    // Add Friday override (defaults to 07:00–13:00 — exactly what we want).
    await page.getByRole('button', { name: 'Sex', exact: true }).click();

    await page.screenshot({ path: 'screenshots/full-02-jornada-form.png', fullPage: true });
    await page.getByRole('button', { name: 'Criar jornada' }).click();
    await page.waitForURL(/\/configuracoes\/jornada$/, { timeout: 5000 });
    await page.screenshot({ path: 'screenshots/full-02b-jornada-list.png', fullPage: true });
    await expect(page.locator('a', { hasText: jornadaNome })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 2. OPERÁRIO — Maria, tied to the jornada we just made
  // ---------------------------------------------------------------------------
  await test.step('create operário tied to the new jornada', async () => {
    await page.getByRole('link', { name: 'Funcionários' }).click();
    await page.waitForURL(/\/operarios$/);
    await page.getByRole('link', { name: '+ Novo funcionário' }).click();
    await page.waitForURL(/\/operarios\/novo$/);

    await safeFill(page.getByLabel('Nome'), operarioNome);
    await selectRadix(page, page.getByRole('combobox', { name: 'Jornada de trabalho' }), jornadaNome);

    await page.getByRole('button', { name: 'Criar funcionário' }).click();
    await page.waitForURL(/\/operarios$/);
    await expect(page.getByText(operarioNome)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3. DIA ESPECIAL — half-day for Maria, day-after-tomorrow
  // ---------------------------------------------------------------------------
  await test.step('create dia especial (half-day) for the new operário', async () => {
    await page.getByRole('link', { name: 'Dias especiais' }).click();
    await page.waitForURL(/\/configuracoes\/dias-especiais$/);
    await page.getByRole('button', { name: '+ Novo dia especial' }).click();

    // The modal is a shadcn Dialog — scope by its role.
    const modal = page.getByRole('dialog');

    await modal.getByLabel('Data').fill(diaEspecialData);
    await safeFill(modal.getByLabel('Descrição'), diaEspecialDescricao);
    // Defaults 07:00-13:00 are fine for a half-day.

    // Tick our test operário in the operários grid (Radix checkbox → click to toggle on).
    await modal.getByRole('checkbox', { name: new RegExp(operarioNome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) }).click();

    await modal.getByRole('button', { name: 'Salvar' }).click();
    // Modal closes → list shows the new dia.
    await expect(page.getByText(diaEspecialDescricao)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 4. LOTE — with two operações and tamanhos P/M/G
  // ---------------------------------------------------------------------------
  await test.step('create lote with two operações and three tamanhos', async () => {
    await page.getByRole('link', { name: 'Lotes' }).click();
    await page.waitForURL(/\/lotes$/);
    await page.getByRole('link', { name: /Novo lote|\+ Novo lote/ }).click();
    await page.waitForURL(/\/lotes\/novo$/);

    await safeFill(page.getByLabel('Código'), loteCodigo);
    await safeFill(page.getByLabel('Nome'), loteNome);

    // Add two operações.
    const operacoesSection = page.getByRole('region', { name: 'Operações' });
    await operacoesSection.getByRole('button', { name: '+ Adicionar' }).click();
    let opRows = operacoesSection.locator('div.flex.gap-3');
    await safeFill(opRows.nth(0).getByLabel('Nome'), operacaoCostura);
    await safeFill(opRows.nth(0).getByLabel('Meta / hora'), String(META_COSTURA_POR_HORA));

    await operacoesSection.getByRole('button', { name: '+ Adicionar' }).click();
    opRows = operacoesSection.locator('div.flex.gap-3');
    await safeFill(opRows.nth(1).getByLabel('Nome'), operacaoAcabamento);
    await safeFill(opRows.nth(1).getByLabel('Meta / hora'), String(META_ACABAMENTO_POR_HORA));

    // Add three tamanhos.
    const tamanhosSection = page.getByRole('region', { name: 'Tamanhos' });
    for (const [tam, qtd] of [['P', 50], ['M', 50], ['G', 30]] as const) {
      await tamanhosSection.getByRole('button', { name: '+ Adicionar' }).click();
      const tamRows = tamanhosSection.locator('div.flex.gap-3');
      const last = tamRows.last();
      await safeFill(last.getByLabel('Tamanho'), tam);
      await safeFill(last.getByLabel('Quantidade'), String(qtd));
    }

    await page.getByRole('button', { name: 'Criar lote' }).click();
    await page.waitForURL(/\/lotes$/);
    await expect(page.getByText(loteCodigo)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 5. SYNC + verify backend has all four entities
  // ---------------------------------------------------------------------------
  let api: APIRequestContext;
  let token: string;

  await test.step('wait for sync and verify entities reached the backend', async () => {
    await page.getByRole('link', { name: 'Facilitador' }).click();
    await waitForSync(page);

    ({ req: api, token } = await apiClient());
    const headers = authHeaders(token);

    const jornadasRes = await api.get('/api/jornadas', { headers });
    const jornadas = await jornadasRes.json();
    const j = jornadas.find((x: any) => x.nome === jornadaNome);
    expect(j, 'jornada not found via API').toBeTruthy();
    expect(j.diasSemana, 'friday override missing').toEqual(
      expect.arrayContaining([expect.objectContaining({ diaSemana: 5 })]),
    );

    const operariosRes = await api.get('/api/operarios', { headers });
    const operarios = await operariosRes.json();
    const op = operarios.find((x: any) => x.nome === operarioNome);
    expect(op, 'operário not found via API').toBeTruthy();
    expect(op.jornadaId).toBe(j.id);

    const lotesRes = await api.get('/api/lotes', { headers });
    const lotes = await lotesRes.json();
    const lote = lotes.find((x: any) => x.codigo === loteCodigo);
    expect(lote, 'lote not found via API').toBeTruthy();
    expect(lote.operacoes).toHaveLength(2);
    expect(lote.tamanhos).toHaveLength(3);

    const diasRes = await api.get('/api/dias-especiais', { headers });
    const dias = await diasRes.json();
    const dia = dias.find((x: any) => x.descricao === diaEspecialDescricao);
    expect(dia, 'dia especial not found via API').toBeTruthy();
    expect(dia.operarioIds).toContain(op.id);
  });

  // ---------------------------------------------------------------------------
  // 6. PACK — register via Facilitador (auto-creates the alocação)
  // ---------------------------------------------------------------------------
  await test.step('register a pack via Facilitador', async () => {
    // We're already on /facilitador. Wait for Maria's card to render.
    const card = page.locator('li', { has: page.getByRole('heading', { name: operarioNome }) });
    await expect(card).toBeVisible({ timeout: 10_000 });

    await card.getByRole('button', { name: '+ Pack' }).click();

    // Modal — shadcn Dialog with Radix selects.
    const modal = page.getByRole('dialog');
    await selectRadix(page, modal.getByRole('combobox', { name: 'Lote' }), `${loteCodigo} — ${loteNome}`);
    await selectRadix(page, modal.getByRole('combobox', { name: 'Operação' }), operacaoCostura);
    await selectRadix(page, modal.getByRole('combobox', { name: 'Tamanho' }), new RegExp(`^${TAMANHO_PACK}\\b`));
    await safeFill(modal.getByLabel('Quantidade de peças'), String(QTD_PACK));

    await modal.getByRole('button', { name: 'Registrar' }).click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });

    // Card shows the pack count next to Maria's name.
    await expect(card.locator('.text-emerald-700').first()).toHaveText(String(QTD_PACK));
  });

  // ---------------------------------------------------------------------------
  // 7. SYNC + verify pack reached backend
  // ---------------------------------------------------------------------------
  await test.step('wait for sync and verify the pack via API', async () => {
    await waitForSync(page);
    const headers = authHeaders(token);
    const data = todayISO();
    const packsRes = await api.get(`/api/packs?data=${data}`, { headers });
    const packs = await packsRes.json();
    const ours = packs.filter((p: any) => p.loteCodigo === loteCodigo);
    expect(ours.length, 'pack did not reach backend').toBeGreaterThanOrEqual(1);
    const total = ours.reduce((s: number, p: any) => s + p.quantidade, 0);
    expect(total).toBe(QTD_PACK);
    expect(ours[0].operacaoNome).toBe(operacaoCostura);
    expect(ours[0].tamanho).toBe(TAMANHO_PACK);

    // And there must be a matching alocação (auto-created by PackModal).
    const alocsRes = await api.get(`/api/alocacoes?data=${data}`, { headers });
    const alocs = await alocsRes.json();
    const matching = alocs.find((a: any) => a.id === ours[0].alocacaoId);
    expect(matching, 'auto-created alocação missing').toBeTruthy();
  });

  // ---------------------------------------------------------------------------
  // 8. RELATÓRIOS — KPIs, top operários, detalhe-do-dia all show our data
  // ---------------------------------------------------------------------------
  await test.step('verify the report renders our production', async () => {
    await page.getByRole('link', { name: 'Relatórios' }).click();
    await page.waitForURL(/\/relatorios$/);

    // The page auto-loads on mount. Wait for the API call.
    await page.waitForResponse(
      (r) => r.url().includes('/api/relatorios/producao-operario-dia') && r.status() === 200,
      { timeout: 15_000 },
    );

    // KPI: total >= QTD_PACK.
    const totalKpi = page.locator('[data-slot="card"]', { has: page.getByText('Total de peças') }).first();
    const totalText = (await totalKpi.locator('p.text-2xl, p.text-3xl').first().textContent()) ?? '0';
    const totalNum = parseInt(totalText.replace(/\D/g, ''), 10);
    expect(totalNum, 'total peças KPI is below the pack we just registered').toBeGreaterThanOrEqual(QTD_PACK);

    // Top operários section contains Maria.
    await expect(page.getByText(operarioNome).first()).toBeVisible();

    // "Detalhe do dia" — set today, scroll to it, find Maria's row.
    const diaInput = page.locator('input[type="date"]').last();
    await diaInput.fill(todayISO());
    await page.waitForTimeout(500); // let liveQuery + Dexie reconcile

    const detalheSection = page.locator('section', { has: page.getByRole('heading', { name: 'Detalhe do dia' }) });
    const mariaRow = detalheSection.locator('div.border', { has: page.getByRole('heading', { name: operarioNome }) });
    await expect(mariaRow).toBeVisible({ timeout: 10_000 });
    // The "X / Y" text appears in both the row total and the per-operação span;
    // .first() avoids strict-mode ambiguity.
    await expect(mariaRow.getByText(new RegExp(`${QTD_PACK}\\s*/\\s*\\d+`)).first()).toBeVisible();
    await expect(mariaRow.getByText(loteCodigo, { exact: false }).first()).toBeVisible();
    await expect(mariaRow.getByText(operacaoCostura).first()).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 9. No JS errors during the whole walkthrough.
  // ---------------------------------------------------------------------------
  await test.step('no uncaught page errors during walkthrough', async () => {
    const fatal = errors.filter((e) => !/Failed to load resource/i.test(e));
    expect(fatal, `unexpected runtime errors:\n${fatal.join('\n---\n')}`).toEqual([]);
  });
});
