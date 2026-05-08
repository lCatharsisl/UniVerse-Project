import axios from 'axios';
import { getApiBaseUrl } from '../utils/apiBase';

const parsedTimeout = Number(import.meta.env.VITE_API_TIMEOUT_MS);
const axiosTimeoutMs =
    Number.isFinite(parsedTimeout) && parsedTimeout >= 3000 ? parsedTimeout : 28000;

const api = axios.create({
    baseURL: getApiBaseUrl(),
    timeout: axiosTimeoutMs,
});

// Request interceptor to add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('sessionToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Login/register sayfasındaysak yönlendirme yapma — hata mesajı gösterilsin
            const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register';
            if (!isAuthPage) {
                localStorage.removeItem('sessionToken');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
