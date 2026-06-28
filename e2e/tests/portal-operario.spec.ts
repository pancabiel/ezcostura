/**
 * Portal do operário — fluxo ponta a ponta.
 *
 * admin cria jornada + operário (com CPF) + lote → registra um pack via
 * Facilitador → operário entra no portal /meu/login com os 4 primeiros dígitos
 * do CPF → /meu mostra a produção → vê a semana → troca o PIN em /meu/pin →
 * relogin com o PIN novo funciona e com o antigo falha.
 *
 * Um único test() para preservar o estado do Dexie/IndexedDB pela cadeia toda.
 * Drива a UI real no Firefox contra backend + Postgres + frontend dev.
 */
import { test, expect, APIRequestContext } from '@playwright/test';
import {
  apiClient,
  authHeaders,
  login,
  RUN_TAG,
  safeFill,
  selectRadix,
  TENANT,
  todayISO,
  waitForSync,
} from '../lib/helpers';

test.describe.configure({ mode: 'serial' });

const tag = RUN_TAG;
const jornadaNome = `${tag} Jornada portal`;
const operarioNome = `${tag} Operário Portal`;
const loteCodigo = `${tag}-LP`;
const loteNome = `${tag} Lote portal`;
const operacaoNome = `${tag} Costura`;
const META_POR_HORA = 60;
const QTD_PACK = 24;
const TAMANHO_PACK = 'M';

// CPF único por run (só dígitos importam — o backend não valida dígito verificador).
const cpfDigits = String(Date.now()).slice(-11).padStart(11, '0');
const pinInicial = cpfDigits.slice(0, 4);
const pinNovo = String((parseInt(pinInicial, 10) + 1) % 10000).padStart(4, '0');

/** Digita dígito a dígito — robusto para inputs com máscara (CPF) no Firefox. */
async function typeDigits(loc: import('@playwright/test').Locator, digits: string) {
  await loc.waitFor({ state: 'visible' });
  await loc.click();
  await loc.fill('');
  await loc.pressSequentially(digits, { delay: 10 });
}

test('portal do operário: criar → entrar → ver produção → trocar PIN → relogin', async ({ page }) => {
  test.setTimeout(180_000);

  console.log(`[E2E] RUN_TAG = ${tag}`);
  console.log(`[E2E] cpf = ${cpfDigits}  pinInicial = ${pinInicial}  pinNovo = ${pinNovo}`);

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.stack ?? e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console.error: ${m.text()}`);
  });

  let api: APIRequestContext;
  let token: string;
  let operarioServerId: string;

  // ---------------------------------------------------------------------------
  // 1. admin login
  // ---------------------------------------------------------------------------
  await test.step('login as admin', async () => {
    await login(page);
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 2. jornada (mínima — defaults 07:00–17:00)
  // ---------------------------------------------------------------------------
  await test.step('create jornada', async () => {
    await page.getByRole('link', { name: 'Jornadas' }).click();
    await page.waitForURL(/\/configuracoes\/jornada$/);
    await page.getByRole('link', { name: '+ Nova jornada' }).click();
    await page.waitForURL(/\/configuracoes\/jornada\/nova$/);
    await safeFill(page.getByLabel('Nome'), jornadaNome);
    await page.getByRole('button', { name: 'Criar jornada' }).click();
    await page.waitForURL(/\/configuracoes\/jornada$/, { timeout: 5000 });
    await expect(page.locator('a', { hasText: jornadaNome })).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 3. operário com CPF (PIN inicial = 4 primeiros dígitos do CPF)
  // ---------------------------------------------------------------------------
  await test.step('create operário with CPF', async () => {
    await page.getByRole('link', { name: 'Funcionários' }).click();
    await page.waitForURL(/\/operarios$/);
    await page.getByRole('link', { name: '+ Novo funcionário' }).click();
    await page.waitForURL(/\/operarios\/novo$/);

    await safeFill(page.getByLabel('Nome'), operarioNome);
    await typeDigits(page.getByLabel('CPF'), cpfDigits);
    await selectRadix(page, page.getByRole('combobox', { name: 'Jornada de trabalho' }), jornadaNome);

    await page.getByRole('button', { name: 'Criar funcionário' }).click();
    await page.waitForURL(/\/operarios$/);
    await expect(page.getByText(operarioNome)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 4. lote com uma operação e um tamanho
  // ---------------------------------------------------------------------------
  await test.step('create lote', async () => {
    await page.getByRole('link', { name: 'Lotes' }).click();
    await page.waitForURL(/\/lotes$/);
    await page.getByRole('link', { name: /Novo lote|\+ Novo lote/ }).click();
    await page.waitForURL(/\/lotes\/novo$/);

    await safeFill(page.getByLabel('Código'), loteCodigo);
    await safeFill(page.getByLabel('Nome'), loteNome);

    const operacoesSection = page.getByRole('region', { name: 'Operações' });
    await operacoesSection.getByRole('button', { name: '+ Adicionar' }).click();
    const opRow = operacoesSection.locator('div.flex.gap-3').first();
    await safeFill(opRow.getByLabel('Nome'), operacaoNome);
    await safeFill(opRow.getByLabel('Meta / hora'), String(META_POR_HORA));

    const tamanhosSection = page.getByRole('region', { name: 'Tamanhos' });
    await tamanhosSection.getByRole('button', { name: '+ Adicionar' }).click();
    const tamRow = tamanhosSection.locator('div.flex.gap-3').last();
    await safeFill(tamRow.getByLabel('Tamanho'), TAMANHO_PACK);
    await safeFill(tamRow.getByLabel('Quantidade'), '100');

    await page.getByRole('button', { name: 'Criar lote' }).click();
    await page.waitForURL(/\/lotes$/);
    await expect(page.getByText(loteCodigo)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 5. sync + confirmar operário no backend (com temPin)
  // ---------------------------------------------------------------------------
  await test.step('sync and verify operário has portal access (temPin)', async () => {
    await page.getByRole('link', { name: 'Facilitador' }).click();
    await waitForSync(page);

    ({ req: api, token } = await apiClient());
    const headers = authHeaders(token);
    const operariosRes = await api.get('/api/operarios', { headers });
    const operarios = await operariosRes.json();
    const op = operarios.find((x: any) => x.nome === operarioNome);
    expect(op, 'operário não chegou ao backend').toBeTruthy();
    expect(op.temPin, 'operário deveria ter PIN inicial (acesso ao portal)').toBe(true);
    operarioServerId = op.id;
  });

  // ---------------------------------------------------------------------------
  // 6. pack via Facilitador (auto-cria a alocação)
  // ---------------------------------------------------------------------------
  await test.step('register a pack via Facilitador', async () => {
    const card = page.locator('li', { has: page.getByRole('heading', { name: operarioNome }) });
    await expect(card).toBeVisible({ timeout: 10_000 });
    await card.getByRole('button', { name: '+ Pack' }).click();

    const modal = page.getByRole('dialog');
    await selectRadix(page, modal.getByRole('combobox', { name: 'Lote' }), `${loteCodigo} — ${loteNome}`);
    await selectRadix(page, modal.getByRole('combobox', { name: 'Operação' }), operacaoNome);
    await selectRadix(page, modal.getByRole('combobox', { name: 'Tamanho' }), new RegExp(`^${TAMANHO_PACK}\\b`));
    await safeFill(modal.getByLabel('Quantidade de peças'), String(QTD_PACK));

    await modal.getByRole('button', { name: 'Registrar' }).click();
    await expect(modal).not.toBeVisible({ timeout: 5_000 });
    await expect(card.locator('.text-emerald-700').first()).toHaveText(String(QTD_PACK));

    await waitForSync(page);
    const headers = authHeaders(token);
    const packsRes = await api.get(`/api/packs?data=${todayISO()}`, { headers });
    const packs = await packsRes.json();
    const ours = packs.filter((p: any) => p.operarioId === operarioServerId);
    const total = ours.reduce((s: number, p: any) => s + p.quantidade, 0);
    expect(total, 'pack não chegou ao backend').toBe(QTD_PACK);
  });

  // ---------------------------------------------------------------------------
  // 7. portal: login com CPF + PIN inicial → home mostra a produção
  // ---------------------------------------------------------------------------
  await test.step('portal login with default PIN shows production', async () => {
    await page.goto('/meu/login');
    await page.getByLabel('Facção').fill(TENANT);
    await typeDigits(page.getByLabel('CPF'), cpfDigits);
    await page.getByLabel('PIN').fill(pinInicial);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await page.waitForURL(/\/meu$/, { timeout: 10_000 });
    await expect(page.getByText(operarioNome)).toBeVisible();
    // KPI principal mostra o total produzido.
    await expect(page.getByText(new RegExp(`${QTD_PACK}\\s*/`)).first()).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 8. portal: tela Semana renderiza
  // ---------------------------------------------------------------------------
  await test.step('portal semana renders', async () => {
    await page.getByRole('button', { name: 'Ver minha semana' }).click();
    await page.waitForURL(/\/meu\/semana$/);
    await expect(page.getByText('Produção por dia')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Total na semana')).toBeVisible();
    await page.getByRole('button', { name: 'Voltar ao início' }).click();
    await page.waitForURL(/\/meu$/);
  });

  // ---------------------------------------------------------------------------
  // 9. portal: trocar PIN
  // ---------------------------------------------------------------------------
  await test.step('change PIN in /meu/pin', async () => {
    await page.getByRole('button', { name: 'Trocar meu PIN' }).click();
    await page.waitForURL(/\/meu\/pin$/);

    await page.getByLabel('PIN atual').fill(pinInicial);
    await page.getByLabel('Novo PIN (4 a 6 dígitos)').fill(pinNovo);
    await page.getByLabel('Confirmar novo PIN').fill(pinNovo);
    await page.getByRole('button', { name: 'Salvar novo PIN' }).click();

    // Sucesso → volta para /meu.
    await page.waitForURL(/\/meu$/, { timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // 10. relogin: PIN antigo falha, PIN novo funciona
  // ---------------------------------------------------------------------------
  await test.step('relogin: old PIN fails, new PIN works', async () => {
    await page.getByRole('button', { name: 'Sair' }).click();
    await page.waitForURL(/\/meu\/login$/);

    // PIN antigo → erro, continua em /meu/login.
    await page.getByLabel('Facção').fill(TENANT);
    await typeDigits(page.getByLabel('CPF'), cpfDigits);
    await page.getByLabel('PIN').fill(pinInicial);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText('CPF ou PIN inválidos.')).toBeVisible({ timeout: 10_000 });
    expect(page.url()).toMatch(/\/meu\/login$/);

    // PIN novo → entra.
    await page.getByLabel('PIN').fill(pinNovo);
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL(/\/meu$/, { timeout: 10_000 });
    await expect(page.getByText(operarioNome)).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // 11. sem erros de runtime
  // ---------------------------------------------------------------------------
  await test.step('no uncaught page errors', async () => {
    const fatal = errors.filter((e) => !/Failed to load resource/i.test(e));
    expect(fatal, `erros de runtime inesperados:\n${fatal.join('\n---\n')}`).toEqual([]);
  });
});
