import axios from 'axios';
import { getPortalSession, usePortalAuthStore } from '../stores/portalAuthStore';

/**
 * Axios separado do `api` admin: usa a sessão do operário (chave própria no localStorage)
 * e refresha contra o endpoint /api/auth/operario/refresh. Sem isso, um operário logado
 * derrubaria a sessão do admin (e vice-versa).
 */
export const portalApi = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

portalApi.interceptors.request.use((config) => {
  const session = getPortalSession();
  if (session?.accessToken) {
    config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  return config;
});

let refreshing: Promise<string> | null = null;

portalApi.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    const original = error.config;
    const session = getPortalSession();

    if (status === 401 && session && !original._retry) {
      original._retry = true;
      try {
        const token = await refresh(session.refreshToken);
        original.headers.Authorization = `Bearer ${token}`;
        return portalApi(original);
      } catch {
        usePortalAuthStore.getState().setSession(null);
      }
    }
    return Promise.reject(error);
  },
);

async function refresh(refreshToken: string): Promise<string> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const { data } = await axios.post('/api/auth/operario/refresh', { refreshToken });
    usePortalAuthStore.getState().setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      operarioId: data.operarioId,
      nome: data.nome,
      tenantId: data.tenantId,
    });
    return data.accessToken as string;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}
