import axios from 'axios';

const api = axios.create({
  // Production: rely on the host serving the origin safely. Development: proxy to local port.
  baseURL: import.meta.env.PROD 
    ? '/api' 
    : 'http://localhost:7542/api',
});

// Interceptor to add token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
