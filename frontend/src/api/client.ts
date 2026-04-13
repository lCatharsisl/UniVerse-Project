import axios from 'axios';

function apiBaseURL(): string {
    const origin = (import.meta.env.VITE_API_ORIGIN as string | undefined)?.trim().replace(/\/$/, '');
    if (origin) return `${origin}/api`;
    return '/api';
}

const api = axios.create({
    baseURL: apiBaseURL(),
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
