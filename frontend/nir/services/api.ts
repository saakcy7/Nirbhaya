import axios from 'axios';
import { API_BASE_URL } from '../config';
import { getToken } from '../storage/auth';

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data)
};

export const sosAPI = {
  trigger: (data: any) => api.post('/sos/trigger', data),
  resolve: (alertId: number | string) => api.put(`/sos/resolve/${alertId}`)
};

export const incidentsAPI = {
  locationHistory: (lat: number, lng: number, radiusKm = 1.5) =>
    api.get('/incidents/location-history', {
      params: { lat, lng, radius_km: radiusKm },
    }),

  report: (payload: {
    reporter_id?: number | null;
    latitude: number;
    longitude: number;
    incident_type: string;
    severity?: number;
    description?: string | null;
    area_name?: string | null;
    time_of_day?: number | null;
  }) => api.post('/incidents/report', payload),
};

// Cleaned up Heatmap Domain APIs
export const heatmapAPI = {
  // FIX 1: Map "nearby" here so it routes to /heatmap/nearby instead of /incidents/nearby
  nearby: (lat: number, lng: number, radiusKm = 2.0) =>
    api.get('/heatmap/nearby', {
      // FIX 2: Backend Zod schema expects 'radius', not 'radius_km' for this endpoint
      params: { lat, lng, radius: radiusKm }, 
    }),

  getGrid: (lat: number, lng: number, radius = 5) =>
    api.get(`/heatmap/grid?lat=${lat}&lng=${lng}&radius_km=${radius}`),

  getRiskScore: (lat: number, lng: number, hour?: number) =>
    api.get(`/heatmap/risk-score?lat=${lat}&lng=${lng}${hour !== undefined ? `&hour=${hour}` : ''}`)
};

export const contactsAPI = {
  add: (data: any) => api.post('/contacts/add', data),
  getAll: (userId: number | string) => api.get(`/contacts/${userId}`),
  delete: (contactId: number | string) => api.delete(`/contacts/${contactId}`)
};

export default api;