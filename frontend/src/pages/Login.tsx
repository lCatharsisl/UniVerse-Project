import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff, FiNavigation, FiGlobe, FiCloud } from 'react-icons/fi';

type AuthProvidersResponse = {
    microsoft?: {
        enabled?: boolean;
    };
};

const LOGIN_SLOGANS = [
    'Sync with Campus.',
    'Connect to Community.',
    'Explore your UniVerse.',
    'Broadcast your Story.',
    'Your Campus. Your Rules.',
    'Join the Transmission.',
    'Elevate Your Experience.',
    'Stay in the Flow.'
] as const;

const LOGIN_PAGE_STYLES = `
    @keyframes bounce-hop {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-15px); }
    }
    .animate-bounce-hop {
        animation: bounce-hop 2s infinite ease-in-out;
    }
    .cursor-blink::after {
        content: '|';
        animation: blink 0.7s infinite;
        color: var(--uv-primary);
        margin-left: 2px;
    }
    @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
    }
    @keyframes space-drift {
        from { transform: translateY(0); }
        to { transform: translateY(-1000px); }
    }
    .stars-layer {
        position: absolute;
        inset: 0;
        background-image:
            radial-gradient(1px 1px at 20px 30px, #eee, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 130px 80px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
        background-size: 200px 200px;
        animation: space-drift 100s linear infinite;
        opacity: 0.5;
    }
    .stars-layer-fast {
        background-size: 300px 300px;
        animation-duration: 60s;
        opacity: 0.8;
    }
    .nebula {
        position: absolute;
        width: 150%;
        height: 150%;
        top: -25%;
        left: -25%;
        background: radial-gradient(circle at 30% 70%, rgba(100, 80, 255, 0.15) 0%, transparent 40%),
                    radial-gradient(circle at 70% 30%, rgba(255, 50, 200, 0.1) 0%, transparent 40%);
        filter: blur(80px);
        animation: nebula-drift 30s ease-in-out infinite alternate;
    }
    @keyframes nebula-drift {
        from { transform: rotate(0deg) scale(1); }
        to { transform: rotate(10deg) scale(1.1); }
    }
    @keyframes rocket-move {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(10px, -20px) rotate(5deg); }
        75% { transform: translate(-10px, -10px) rotate(-5deg); }
    }
    @keyframes float {
        0%, 100% { transform: translateY(0) rotate(0); }
        50% { transform: translateY(-30px) rotate(10deg); }
    }
    .animate-rocket { animation: rocket-move 6s ease-in-out infinite; }
    .animate-float { animation: float 10s ease-in-out infinite; }
    .animate-float-delayed { animation: float 14s ease-in-out infinite reverse; }
`;

const LoginTypewriter = memo(({ isSpace }: { isSpace: boolean }) => {
    const [currentSloganIndex, setCurrentSloganIndex] = useState(0);
    const [displayText, setDisplayText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [typingSpeed, setTypingSpeed] = useState(100);

    useEffect(() => {
        const handleTyping = () => {
            const fullText = LOGIN_SLOGANS[currentSloganIndex];
            if (isDeleting) {
                setDisplayText((prev) => prev.substring(0, prev.length - 1));
                setTypingSpeed(50);
            } else {
                setDisplayText((prev) => fullText.substring(0, prev.length + 1));
                setTypingSpeed(100);
            }

            if (!isDeleting && displayText === fullText) {
                setTimeout(() => setIsDeleting(true), 1500);
            } else if (isDeleting && displayText === '') {
                setIsDeleting(false);
                setCurrentSloganIndex((prev) => (prev + 1) % LOGIN_SLOGANS.length);
            }
        };

        const timer = setTimeout(handleTyping, typingSpeed);
        return () => clearTimeout(timer);
    }, [currentSloganIndex, displayText, isDeleting, typingSpeed]);

    return (
        <h1 className={`text-3xl md:text-5xl lg:text-6xl font-black tracking-tighter leading-tight cursor-blink ${isSpace ? 'text-white' : 'text-uv-black'}`}>
            {displayText}
        </h1>
    );
});

const LoginVisualPanel = memo(() => (
    <div className="hidden md:flex flex-1 bg-[#050510] items-center justify-center p-20 select-none relative overflow-hidden">
        <div className="nebula" />
        <div className="stars-layer" />
        <div className="stars-layer stars-layer-fast" />

        <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-800 opacity-40 blur-[2px] animate-float shadow-[0_0_50px_rgba(255,100,0,0.2)]" />
        <div className="absolute bottom-40 left-20 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-900 opacity-30 blur-[1px] animate-float-delayed" />
        <div className="absolute top-1/2 left-10 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-900 opacity-20 animate-float" />

        <div className="absolute top-1/3 left-1/4 text-white opacity-40 animate-rocket pointer-events-none">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor">
                <path d="M13.13,2.57c-2.47-0.91-5.07,0.36-6.19,2.68c-0.12,0.25-0.23,0.51-0.32,0.78C5.25,9.22,5.2,12.72,5.2,12.72l-1.92,1.92 c-0.39,0.39-0.39,1.02,0,1.41l2.42,2.42c0.39,0.39,1.02,0.39,1.41,0l1.92-1.92c0,0,3.5,0.05,6.69-1.42c0.27-0.12,0.53-0.25,0.78-0.39 c2.32-1.12,3.59-3.72,2.68-6.19C15.06,5.32,13.13,2.57,13.13,2.57z M8.57,15.43c-0.78-0.78-0.78-2.05,0-2.83 c0.78-0.78,2.05-0.78,2.83,0c0.78,0.78,0.78,2.05,0,2.83C10.62,16.21,9.35,16.21,8.57,15.43z M18.41,18.41 c-0.39-0.39-1.02-0.39-1.41,0l-2.12,2.12c-0.39,0.39-0.39,1.02,0,1.41l0.71,0.71c0.39,0.39,1.02,0.39,1.41,0l2.12-2.12 c0.39-0.39,0.39-1.02,0-1.41L18.41,18.41z" />
            </svg>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050510]/50 to-[#050510]" />

        <div className="z-10 text-center">
            <img src="/logo.svg" alt="UniVerse Logo" className="w-64 h-auto drop-shadow-[0_0_30px_rgba(100,80,255,0.3)] animate-bounce-hop" />
        </div>
        <div className="absolute bottom-10 left-10 text-white/40 font-black text-xs uppercase tracking-[0.5em] z-10">UniVerse Ecosystem v2.0</div>
    </div>
));

const Login = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [microsoftEnabled, setMicrosoftEnabled] = useState(false);
    const [microsoftLoading, setMicrosoftLoading] = useState(true);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { dimension, toggleDimension } = useTheme();
    const isSpace = dimension === 'space';

    useEffect(() => {
        api.get<AuthProvidersResponse>('/auth/providers')
            .then((res) => setMicrosoftEnabled(Boolean(res.data?.microsoft?.enabled)))
            .catch(() => setMicrosoftEnabled(false))
            .finally(() => setMicrosoftLoading(false));
    }, []);

    useEffect(() => {
        const hash = window.location.hash.startsWith('#')
            ? window.location.hash.slice(1)
            : window.location.hash;

        if (!hash) {
            return;
        }

        const params = new URLSearchParams(hash);
        const sessionToken = params.get('sessionToken');
        const authError = params.get('authError');
        const returnTo = params.get('returnTo') || '/feed';

        if (!sessionToken && !authError) {
            return;
        }

        window.history.replaceState(null, '', window.location.pathname + window.location.search);

        if (authError) {
            setError(authError);
            return;
        }

        if (!sessionToken) {
            return;
        }

        setLoading(true);
        localStorage.setItem('sessionToken', sessionToken);
        api.get('/auth/me')
            .then((meRes) => {
                login(sessionToken, meRes.data);
                navigate(returnTo, { replace: true });
            })
            .catch((err: any) => {
                localStorage.removeItem('sessionToken');
                setError(err.response?.data?.error || t('login.error'));
            })
            .finally(() => setLoading(false));
    }, [login, navigate, t]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const loginRes = await api.post('/auth/login', { email, password });
            const { sessionToken } = loginRes.data;
            localStorage.setItem('sessionToken', sessionToken);
            const meRes = await api.get('/auth/me');
            login(sessionToken, meRes.data);
            navigate('/feed');
        } catch (err: any) {
            setError(err.response?.data?.error || t('login.error'));
        } finally {
            setLoading(false);
        }
    };

    const handleMicrosoftLogin = () => {
        window.location.href = '/api/auth/microsoft/start?returnTo=%2Ffeed';
    };

    return (
        <div className={`min-h-screen flex flex-col md:flex-row overflow-hidden transition-colors duration-700 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
            <style>{LOGIN_PAGE_STYLES}</style>

            {/* Floating Dimension Toggle */}
            <div className="fixed bottom-6 left-6 z-[80] flex flex-col gap-3">
                <button 
                    type="button"
                    onClick={toggleDimension}
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all group border border-white/10 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
                    title={isSpace ? "Switch to Ground Mode" : "Switch to Space Mode"}
                >
                    {isSpace ? <FiGlobe size={22} /> : <FiCloud size={22} />}
                    <span className={`absolute left-16 ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'} text-[10px] font-black px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap`}>
                        {isSpace ? t('mainLayout.restoreGravity') : t('mainLayout.igniteEngines')}
                    </span>
                </button>
            </div>

            {/* Left Side - Brand Visual */}
            <LoginVisualPanel />

            {/* Right Side - Form */}
            <div className={`flex-1 flex flex-col justify-center px-6 md:px-16 lg:px-24 py-1 md:py-8 relative overflow-y-auto transition-colors duration-700 ${isSpace ? 'bg-[#0a0a1a]' : 'bg-[#fcfcff]'}`}>
                {/* Subtle Right Side Space Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: `radial-gradient(${isSpace ? '#ffffff' : '#050510'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-purple-500/5 rounded-full blur-[80px] pointer-events-none" />

                <div className="max-w-[420px] w-full mx-auto relative z-10 flex flex-col">
                    <div className="md:hidden flex items-center justify-center mx-auto mb-2 mt-4">
                        <img src="/logo.svg" alt="UniVerse Logo" className="w-20 h-20 object-contain animate-bounce-hop drop-shadow-[0_0_25px_rgba(79,70,229,0.5)]" />
                    </div>
                    
                    <div className="mb-4 md:mb-6 text-center md:text-left">
                        <div className="h-[40px] md:h-[60px] lg:h-[130px] flex items-center justify-center md:justify-start">
                            <LoginTypewriter isSpace={isSpace} />
                        </div>
                        <p className={`font-bold text-[10px] md:text-base lg:text-lg tracking-tight mt-1 md:mt-2 ${isSpace ? 'text-gray-400' : 'text-uv-gray'}`}>{t('login.subtitle')}</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-5 bg-red-50 text-red-600 rounded-tl-2xl rounded-br-2xl text-sm font-bold border-l-4 border-red-500 shadow-sm animate-pulse">
                            [ERROR] {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3 md:space-y-6">
                        <div className="space-y-1 group">
                             <label className={`text-[10px] font-black uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`}>{t('login.accessProtocol')}</label>
                             <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full px-4 py-2.5 md:px-5 md:py-3.5 backdrop-blur-sm border rounded-tl-2xl rounded-br-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary/50 outline-none transition-all font-bold shadow-sm ${isSpace ? 'bg-[#111827]/80 border-white/10 text-white placeholder:text-gray-600 focus:bg-[#111827]' : 'bg-white/40 border-uv-border text-uv-black placeholder:text-uv-gray/40 focus:bg-white'}`}
                                    placeholder="name@uni.edu"
                                    required
                                />
                             </div>
                        </div>

                        <div className="space-y-1 group">
                            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`}>{t('login.securityKey')}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full px-4 py-2.5 md:px-5 md:py-3.5 backdrop-blur-sm border rounded-tl-2xl rounded-br-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary/50 outline-none transition-all font-bold shadow-sm ${isSpace ? 'bg-[#111827]/80 border-white/10 text-white placeholder:text-gray-600 focus:bg-[#111827]' : 'bg-white/40 border-uv-border text-uv-black placeholder:text-uv-gray/40 focus:bg-white'}`}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-primary ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`}
                                >
                                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white font-black py-3 md:py-3.5 rounded-tl-3xl rounded-br-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 group relative overflow-hidden border border-primary/50"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10 flex items-center gap-2">
                                {loading ? t('login.syncing') : <><FiNavigation className="rotate-45" /> {t('login.initializeLink')}</>}
                            </span>
                        </button>

                        <button
                            type="button"
                            disabled={loading || microsoftLoading || !microsoftEnabled}
                            onClick={handleMicrosoftLogin}
                            className={`w-full font-black py-3 md:py-3.5 rounded-tl-3xl rounded-br-3xl transition-all flex items-center justify-center gap-2 border ${
                                isSpace
                                    ? 'bg-[#111827]/80 text-white border-white/10 hover:border-white/30 hover:bg-white/10'
                                    : 'bg-white/70 text-uv-black border-uv-border hover:border-primary/40 hover:bg-white'
                            } disabled:opacity-50`}
                        >
                            <span className="text-[10px] md:text-[12px] uppercase tracking-widest">
                                {microsoftLoading ? t('common.loading') : t('login.signInWithMicrosoft')}
                            </span>
                        </button>
                    </form>

                    <div className={`mt-4 pt-3 md:mt-6 md:pt-6 border-t flex flex-col gap-2 md:gap-3 ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
                        <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest block text-center ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`}>{t('login.newToSystem')}</span>
                        <Link to="/register" className={`w-full font-black py-2 md:py-3.5 rounded-tl-2xl rounded-br-2xl flex items-center justify-center transition-all shadow-xl group relative overflow-hidden border ${isSpace ? 'bg-[#111827] text-white hover:bg-white/10 hover:border-white/30 border-white/10 shadow-black/50' : 'bg-uv-black text-white hover:bg-primary border-transparent shadow-black/10'}`}>
                             <div className="absolute inset-0 bg-white/5 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
                             <span className="relative z-10 text-[10px] md:text-[13px] xl:text-base">{t('login.generateAccount')}</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
