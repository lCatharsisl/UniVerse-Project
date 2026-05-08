/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/client';
import { teardownWebPush } from '../utils/webPush';

interface User {
    userId: number;
    email: string;
    role: 'student' | 'staff' | 'admin' | 'community';
    profile?: Record<string, unknown>;
    profileImageUrl?: string;
    warningTier?: number;
    isBanned?: boolean;
}

export function isAcademic(role: string): boolean {
    return role === 'staff' || role === 'admin';
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (token: string, userData: User) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = async () => {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const response = await api.get('/auth/me');
            setUser(response.data);
        } catch (error) {
            console.error('Auth check failed', error);
            localStorage.removeItem('sessionToken');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            void checkAuth();
        }, 0);

        return () => window.clearTimeout(timeoutId);
    }, []);

    const login = (token: string, userData: User) => {
        localStorage.setItem('sessionToken', token);
        setUser(userData);
    };

    const logout = () => {
        void (async () => {
            const token = localStorage.getItem('sessionToken');
            if (token) {
                try {
                    await Promise.race([
                        api.post('/auth/logout'),
                        new Promise<never>((_, reject) =>
                            window.setTimeout(() => reject(new Error('logout-timeout')), 4000),
                        ),
                    ]);
                } catch {
                    /* still clear client + redirect */
                }
            }
            try {
                await Promise.race([
                    teardownWebPush(),
                    new Promise<void>((resolve) => window.setTimeout(resolve, 2500)),
                ]);
            } catch {
                /* ignore */
            }
            localStorage.removeItem('sessionToken');
            setUser(null);
            window.location.href = '/login';
        })();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, checkAuth }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
