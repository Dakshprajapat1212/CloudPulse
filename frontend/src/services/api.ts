import axios from 'axios';

const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
