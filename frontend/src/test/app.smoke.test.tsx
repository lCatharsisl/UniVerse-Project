// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

const authState = {
  user: null as null | Record<string, unknown>,
  isLoading: false,
};

vi.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => authState,
}));

vi.mock('../context/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../context/NotificationsContext', () => ({
  NotificationsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../context/MessagingUnreadContext', () => ({
  MessagingUnreadProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../components/MainLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/ThemedDialogHost', () => ({
  default: () => null,
}));

vi.mock('../pages/Login', () => ({
  default: () => <div>Login Page</div>,
}));

vi.mock('../pages/Register', () => ({
  default: () => <div>Register Page</div>,
}));

vi.mock('../pages/SocialFeed', () => ({
  default: () => <div>Social Feed Page</div>,
}));

vi.mock('../pages/Notifications', () => ({
  default: () => <div>Notifications Page</div>,
}));

describe('App smoke tests', () => {
  it('renders on /register route without crashing', async () => {
    cleanup();
    authState.user = null;
    authState.isLoading = false;

    window.history.pushState({}, '', '/register');
    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('Register Page')).toBeInTheDocument();
  });

  it('renders on /login route without crashing', async () => {
    cleanup();
    authState.user = null;
    authState.isLoading = false;

    window.history.pushState({}, '', '/login');
    const { default: App } = await import('../App');

    render(<App />);

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated /feed access to login route', async () => {
    cleanup();
    authState.user = null;
    authState.isLoading = false;

    window.history.pushState({}, '', '/feed');
    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });

  it('renders /feed when user is authenticated', async () => {
    cleanup();
    authState.user = { userId: 1, role: 'student' };
    authState.isLoading = false;

    window.history.pushState({}, '', '/feed');
    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('Social Feed Page')).toBeInTheDocument();
  });

  it('redirects unauthenticated /notifications access to login route', async () => {
    cleanup();
    authState.user = null;
    authState.isLoading = false;

    window.history.pushState({}, '', '/notifications');
    const { default: App } = await import('../App');
    render(<App />);

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
  });
});
