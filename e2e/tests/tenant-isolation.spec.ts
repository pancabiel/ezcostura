import { test, expect, request, APIRequestContext } from '@playwright/test';
import { BACKEND, authHeaders } from '../lib/helpers';

/**
 * Verifies tenant data isolation: an entity created in one tenant must never
 * appear in another. Hits the backend API directly (port 8080, no CORS) and
 * cleans up everything it creates.
 */

const TAG = `ISO-${Date.now().toString(36)}`;

async function loginAs(req: APIRequestContext, tenantId: string): Promise<string> {
  const res = await req.post(`${BACKEND}/api/auth/login`, {
    data: { tenantId, username: 'admin', password: 'admin' },
  });
  expect(res.ok(), `login failed for tenant "${tenantId}" (${res.status()})`).toBeTruthy();
  return (await res.json()).accessToken;
}

async function createJornada(req: APIRequestContext, token: string, nome: string): Promise<string> {
  const res = await req.post(`${BACKEND}/api/jornadas`, {
    headers: authHeaders(token),
    data: { nome, horaInicio: '08:00', horaFim: '17:00', pausas: [], diasSemana: [] },
  });
  expect(res.status(), `jornada create failed: ${await res.text()}`).toBe(201);
  return (await res.json()).id;
}

async function createOperario(req: APIRequestContext, token: string, nome: string, jornadaId: string): Promise<string> {
  const res = await req.post(`${BACKEND}/api/operarios`, {
    headers: authHeaders(token),
    data: { nome, dataAdmissao: '2026-01-01', ativo: true, jornadaId },
  });
  expect(res.status(), `operario create failed: ${await res.text()}`).toBe(201);
  return (await res.json()).id;
}

async function listOperarioNames(req: APIRequestContext, token: string): Promise<string[]> {
  const res = await req.get(`${BACKEND}/api/operarios`, { headers: authHeaders(token) });
  expect(res.ok(), `operario list failed (${res.status()})`).toBeTruthy();
  return (await res.json()).map((o: { nome: string }) => o.nome);
}

test('operário created in one tenant does not leak into another', async () => {
  const req = await request.newContext();

  const demoToken = await loginAs(req, 'demo');
  const testeToken = await loginAs(req, 'teste');

  const demoName = `${TAG}-operario-demo`;
  const testeName = `${TAG}-operario-teste`;

  const created: { url: string; token: string }[] = [];
  try {
    // Create a jornada + operário in each tenant.
    const demoJornada = await createJornada(req, demoToken, `${TAG}-jornada-demo`);
    created.push({ url: `${BACKEND}/api/jornadas/${demoJornada}`, token: demoToken });
    const demoOperario = await createOperario(req, demoToken, demoName, demoJornada);
    created.push({ url: `${BACKEND}/api/operarios/${demoOperario}`, token: demoToken });

    const testeJornada = await createJornada(req, testeToken, `${TAG}-jornada-teste`);
    created.push({ url: `${BACKEND}/api/jornadas/${testeJornada}`, token: testeToken });
    const testeOperario = await createOperario(req, testeToken, testeName, testeJornada);
    created.push({ url: `${BACKEND}/api/operarios/${testeOperario}`, token: testeToken });

    // Each tenant sees its own operário...
    const demoNames = await listOperarioNames(req, demoToken);
    const testeNames = await listOperarioNames(req, testeToken);

    expect(demoNames, 'demo should see its own operário').toContain(demoName);
    expect(testeNames, 'teste should see its own operário').toContain(testeName);

    // ...but never the other tenant's.
    expect(demoNames, 'demo must NOT see teste operário').not.toContain(testeName);
    expect(testeNames, 'teste must NOT see demo operário').not.toContain(demoName);

    console.log(`demo operários:  ${JSON.stringify(demoNames)}`);
    console.log(`teste operários: ${JSON.stringify(testeNames)}`);
  } finally {
    // Clean up — operários first, then jornadas (operário FK -> jornada).
    for (const item of [...created].reverse()) {
      await req.delete(item.url, { headers: authHeaders(item.token) }).catch(() => {});
    }
    await req.dispose();
  }
});
