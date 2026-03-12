import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Proxied by Vite to localhost:3000
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
