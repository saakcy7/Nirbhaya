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

export const heatmapAPI = {
  nearby: (lat: number, lng: number, radius: number) => 
    api.get('/heatmap/nearby', { 
      params: { lat, lng, radius } 
    }),

  getRiskScore: (lat: number, lng: number) => 
    api.get('/heatmap/risk-score', { 
      params: { lat, lng } 
    }),
  
  getSafestRoute: (startLat: number, startLng: number, endLat: number, endLng: number) => 
    api.get('/heatmap/safest-route', {
      params: {
        start_lat: startLat,
        start_lng: startLng,
        end_lat: endLat,
        end_lng: endLng
      }
    }),

  getGrid: (lat: number, lng: number, radius = 5) =>
    api.get('/heatmap/grid', { 
      params: { lat, lng, radius_km: radius } 
    }),
};

export const contactsAPI = {
  add: (data: any) => api.post('/contacts/add', data),
  getAll: (userId: number | string) => api.get(`/contacts/${userId}`),
  delete: (contactId: number | string) => api.delete(`/contacts/${contactId}`)
};

export default api;