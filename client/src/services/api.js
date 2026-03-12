import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach admin JWT if present (Optional: keep for legacy or if Header is still needed elsewhere)
// But for security, we rely primarily on HttpOnly Cookies managed by the browser.

// Handle 401 - clear local state but cookie deletion is handled by server
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_username');
    }
    return Promise.reject(err);
  }
);

export default api;
