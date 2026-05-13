import { test, expect } from '@playwright/test';
import { login } from '../lib/helpers';

test.describe('ezcostura — admin walkthrough on Firefox', () => {
  test('login + visit every admin route + facilitador renders', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => {
      const detail = err && (err.stack || err.message || String(err));
      consoleErrors.push(`pageerror: ${detail}`);
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const args = msg.args();
        consoleErrors.push(`console.error: ${msg.text()} (args=${args.length})`);
      }
    });

    // 1. Login
    await login(page);
    await expect(page.getByRole('heading', { name: 'ezcostura' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/01-facilitador-after-login.png', fullPage: true });

    // 2. Visit every admin nav link, assert the URL changed and the page rendered.
    const routes: { name: RegExp; path: RegExp }[] = [
      { name: /^Gerenciador$/, path: /\/gerenciador$/ },
      { name: /^Lotes$/, path: /\/lotes$/ },
      { name: /^Operários$/, path: /\/operarios$/ },
      { name: /^Ausências$/, path: /\/ausencias$/ },
      { name: /^Relatórios$/, path: /\/relatorios$/ },
      { name: /^Jornadas$/, path: /\/configuracoes\/jornada$/ },
      { name: /^Dias especiais$/, path: /\/configuracoes\/dias-especiais$/ },
    ];

    for (const r of routes) {
      await page.getByRole('link', { name: r.name }).click();
      await page.waitForURL(r.path, { timeout: 10_000 });
      // Header must still be there → layout intact, no white-screen crash.
      await expect(page.getByRole('heading', { name: 'ezcostura' })).toBeVisible();
      const slug = r.path.source.replace(/[^a-z]/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      await page.screenshot({ path: `screenshots/02-${slug}.png`, fullPage: true });
    }

    // 3. Back to Facilitador — the "register a pack in ≤3 taps" screen.
    await page.getByRole('link', { name: 'Facilitador' }).click();
    await page.waitForURL(/\/facilitador$/);
    await expect(page.getByRole('heading', { name: 'ezcostura' })).toBeVisible();
    await page.screenshot({ path: 'screenshots/03-facilitador-final.png', fullPage: true });

    // 4. Logout works.
    await page.getByRole('button', { name: 'Sair' }).click();
    await page.waitForURL(/\/login$/);

    // 5. No JS exceptions or console errors should have surfaced during the walk.
    //    (axios 401-then-refresh is fine; we only fail on uncaught errors.)
    const fatal = consoleErrors.filter((e) => !/Failed to load resource/i.test(e));
    expect(fatal, `unexpected runtime errors:\n${fatal.join('\n')}`).toEqual([]);
  });

  test('protected routes redirect when logged out', async ({ page }) => {
    await page.goto('/lotes');
    await page.waitForURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'ezcostura' })).toBeVisible();
  });
});
