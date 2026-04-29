import axios from 'axios';
import { getSession, useAuthStore } from '../stores/authStore';

export const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
});

api.interceptors.request.use((config) => {
  const session = getSession();
  if (session?.accessToken) {
    config.headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const status = error?.response?.status;
    const original = error.config;
    const session = getSession();

    if (status === 401 && session && !original._retry) {
      original._retry = true;
      try {
        const token = await getRefreshedToken(session.refreshToken);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        useAuthStore.getState().setSession(null);
      }
    }
    return Promise.reject(error);
  },
);

async function getRefreshedToken(refreshToken: string): Promise<string> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const { data } = await axios.post('/api/auth/refresh', { refreshToken });
    useAuthStore.getState().setSession({
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      userId: data.userId,
      username: data.username,
      tenantId: data.tenantId,
      role: data.role,
    });
    return data.accessToken as string;
  })();
  try {
    return await refreshing;
  } finally {
    refreshing = null;
  }
}
