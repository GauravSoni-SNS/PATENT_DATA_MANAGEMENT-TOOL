import axios from 'axios';

/**
 * In dev, Vite proxies /api to localhost:4000. In production the API lives on
 * another origin (Render), so VITE_API_URL carries its base, e.g.
 * https://lexpatent-api.onrender.com/api/v1
 */
const baseURL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem('accessToken', data.data.accessToken);
        error.config.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return api(error.config);
      } catch {
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

export const mattersApi = {
  list: (params?: Record<string, string>) => api.get('/matters', { params }),
  get: (id: string) => api.get(`/matters/${id}`),
  create: (data: unknown) => api.post('/matters', data),
  exportCsv: () => api.get('/matters/export', { responseType: 'blob' }),
  setSimulatedDate: (date: string) => api.post('/matters/simulated-date', { date }),
  getSimulatedDate: () => api.get('/matters/simulated-date'),
  advanceStage: (id: string, newStage: string, triggerDate?: string) =>
    api.post(`/matters/${id}/advance-stage`, { newStage, triggerDate }),
  setStage: (id: string, currentStage: string) => api.patch(`/matters/${id}`, { currentStage }),
};

export const clientsApi = {
  list: () => api.get('/clients'),
  create: (data: unknown) => api.post('/clients', data),
};

export const notificationsApi = {
  list: () => api.get('/notifications'),
  radar: () => api.get('/notifications/radar'),
  scan: () => api.post('/notifications/scan'),
};

export const receiptsApi = {
  list: () => api.get('/receipts'),
  samples: () => api.get('/receipts/samples'),
  parseSample: (sampleId: string) => api.post('/receipts/parse-sample', { sampleId }),
  autoDocketPreview: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/receipts/auto-docket', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  autoDocketPreviewSample: (sampleId: string) => api.post('/receipts/auto-docket', { sampleId }),
  autoDocketConfirm: (data: unknown) => api.post('/receipts/auto-docket/confirm', data),
};

export const rulesApi = {
  calculate: (data: unknown) => api.post('/rules/calculate', data),
  list: () => api.get('/rules'),
};

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary'),
  users: () => api.get('/dashboard/users'),
};

export const verificationsApi = {
  pending: () => api.get('/verifications/pending'),
  approve: (id: string, notes?: string) => api.post(`/verifications/${id}/approve`, { notes }),
};
