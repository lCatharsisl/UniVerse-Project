import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Proxied by Vite to localhost:3000
    headers: {
        'Content-Type': 'application/json',
    },
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
            localStorage.removeItem('sessionToken');
            // Optional: Redirect to login or trigger global event
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;
