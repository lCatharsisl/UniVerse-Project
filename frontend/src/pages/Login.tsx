/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff, FiNavigation, FiMoon, FiCloud } from 'react-icons/fi';
import LanguageSwitch from '../components/LanguageSwitch';


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
    .light-grid {
        position: absolute;
        inset: 0;
        background-image:
            linear-gradient(rgba(79, 70, 229, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79, 70, 229, 0.06) 1px, transparent 1px);
        background-size: 34px 34px;
        mask-image: linear-gradient(to bottom, rgba(0,0,0,0.9), rgba(0,0,0,0.4) 45%, transparent 100%);
    }
    .light-noise {
        position: absolute;
        inset: 0;
        opacity: 0.18;
        background-image:
            radial-gradient(circle at 20% 20%, rgba(255,255,255,0.95) 0 1px, transparent 1.5px),
            radial-gradient(circle at 80% 30%, rgba(255,255,255,0.85) 0 1px, transparent 1.5px),
            radial-gradient(circle at 34% 70%, rgba(99,102,241,0.25) 0 2px, transparent 2.5px),
            radial-gradient(circle at 70% 78%, rgba(14,165,233,0.18) 0 2px, transparent 2.5px);
        background-size: 120px 120px, 160px 160px, 220px 220px, 280px 280px;
    }
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
        <h1 className={`max-w-[12ch] text-[clamp(2rem,8vw,3.35rem)] md:text-5xl lg:text-6xl font-black tracking-[-0.06em] leading-[0.95] cursor-blink break-words ${isSpace ? 'text-white' : 'text-uv-black'}`}>
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
        <div className="absolute bottom-10 right-10 z-10 whitespace-nowrap text-right text-[10px] font-black uppercase leading-none tracking-[0.14em] text-white/45 sm:text-xs sm:tracking-[0.22em]">
            UniVerse Ecosystem v2.0
        </div>
    </div>
));

function loginApiError(err: unknown, fallback: string): string {
    const data = (err as { response?: { data?: { error?: unknown; message?: unknown } } })?.response?.data;
    if (typeof data?.error === 'string' && data.error.length > 0) return data.error;
    if (typeof data?.message === 'string' && data.message.length > 0) return data.message;
    return fallback;
}

const Login = () => {
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const { dimension, toggleDimension } = useTheme();
    const isSpace = dimension === 'space';


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const loginRes = await api.post('/auth/login', { email, password });
            const { sessionToken } = loginRes.data;
            localStorage.setItem('sessionToken', sessionToken);
            try {
                const meRes = await api.get('/auth/me');
                login(sessionToken, meRes.data);
                navigate('/feed');
            } catch (meErr: any) {
                localStorage.removeItem('sessionToken');
                setError(loginApiError(meErr, t('login.errorProfile')));
            }
        } catch (err: unknown) {
            setError(loginApiError(err, t('login.error')));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-[100svh] md:min-h-screen flex flex-col md:flex-row overflow-x-hidden transition-colors duration-700 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
            <style>{LOGIN_PAGE_STYLES}</style>

            {/* Dil + Space/Ground + sürüm — mobil: sol üst; sm+: alt şerit */}
            <div className="pointer-events-none fixed left-0 right-0 z-[80] flex justify-between gap-6 px-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] top-[calc(0.75rem+env(safe-area-inset-top,0px))] bottom-auto items-start sm:top-auto sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:items-end sm:px-6 sm:pb-0">
                <div className="pointer-events-auto flex shrink-0 flex-col items-start gap-3">
                    <LanguageSwitch dock="left" />
                    <button
                        type="button"
                        onClick={toggleDimension}
                        className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 shadow-2xl transition-all hover:scale-105 active:scale-95 group md:h-14 md:w-14 ${isSpace ? 'bg-primary text-white' : 'bg-uv-black text-white'}`}
                        title={isSpace ? t('mainLayout.switchToGround') : t('mainLayout.switchToSpace')}
                    >
                        {isSpace ? <FiMoon size={22} /> : <FiCloud size={22} />}
                        <span
                            className={`pointer-events-none absolute left-full top-1/2 z-10 ml-2 -translate-y-1/2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[10px] font-black opacity-0 transition-opacity group-hover:opacity-100 ${isSpace ? 'bg-white text-uv-black' : 'bg-uv-black text-white'}`}
                        >
                            {isSpace ? t('mainLayout.restoreGravity') : t('mainLayout.igniteEngines')}
                        </span>
                    </button>
                </div>
                <p
                    className={`pointer-events-none whitespace-nowrap pb-0.5 text-right text-[8px] font-black uppercase leading-none tracking-[0.1em] sm:text-[9px] sm:tracking-[0.14em] md:hidden ${isSpace ? 'text-white/55' : 'text-slate-500'}`}
                >
                    UniVerse Ecosystem v2.0
                </p>
            </div>

            {/* Left Side - Brand Visual */}
            <LoginVisualPanel />

            {/* Right Side - Form */}
            <div className={`flex-1 flex flex-col justify-start md:justify-center px-5 sm:px-6 md:px-16 lg:px-24 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-[max(env(safe-area-inset-bottom,0px),1rem)] md:py-8 relative overflow-x-hidden overflow-y-auto transition-colors duration-700 ${isSpace ? 'bg-[#0a0a1a]' : 'bg-[#fcfcff]'}`}>
                {/* Subtle Right Side Space Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: `radial-gradient(${isSpace ? '#ffffff' : '#050510'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
                <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[100px] pointer-events-none ${isSpace ? 'bg-primary/5' : 'bg-cyan-300/20'}`} />
                <div className={`absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] rounded-full blur-[80px] pointer-events-none ${isSpace ? 'bg-purple-500/5' : 'bg-fuchsia-300/16'}`} />
                {!isSpace && (
                    <>
                        <div className="md:hidden absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.92),rgba(245,247,255,0.96)_36%,rgba(235,240,255,0.98)_70%,rgba(226,232,255,1)_100%)]" />
                        <div className="md:hidden light-grid opacity-70" />
                        <div className="md:hidden light-noise" />
                        <div className="md:hidden absolute top-[9%] right-[7%] h-28 w-28 rounded-full bg-gradient-to-br from-amber-300/55 via-orange-300/35 to-rose-300/20 blur-[10px] animate-float pointer-events-none" />
                        <div className="md:hidden absolute top-[18%] left-[5%] h-24 w-24 rounded-full bg-gradient-to-br from-sky-300/30 to-indigo-400/15 blur-[8px] animate-float-delayed pointer-events-none" />
                        <div className="md:hidden absolute bottom-[18%] right-[5%] h-36 w-36 rounded-full bg-gradient-to-br from-violet-300/18 to-fuchsia-300/10 blur-[22px] pointer-events-none" />
                    </>
                )}
                {isSpace && (
                    <>
                        <div className="md:hidden nebula opacity-90" />
                        <div className="md:hidden stars-layer opacity-60" />
                        <div className="md:hidden stars-layer stars-layer-fast opacity-75" />
                        <div className="md:hidden absolute top-[10%] right-[8%] h-28 w-28 rounded-full bg-gradient-to-br from-orange-500/55 to-red-900/30 blur-[6px] animate-float pointer-events-none" />
                        <div className="md:hidden absolute top-[18%] left-[8%] h-8 w-8 rounded-full bg-gradient-to-br from-violet-400/40 to-fuchsia-900/20 animate-float-delayed pointer-events-none" />
                        <div className="md:hidden absolute bottom-[12%] left-[6%] h-24 w-24 rounded-full bg-gradient-to-br from-blue-400/18 to-indigo-900/14 blur-[2px] animate-float-delayed pointer-events-none" />
                        <div className="md:hidden absolute top-[24%] left-[17%] text-white/25 animate-rocket pointer-events-none">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M13.13,2.57c-2.47-0.91-5.07,0.36-6.19,2.68c-0.12,0.25-0.23,0.51-0.32,0.78C5.25,9.22,5.2,12.72,5.2,12.72l-1.92,1.92 c-0.39,0.39-0.39,1.02,0,1.41l2.42,2.42c0.39,0.39,1.02,0.39,1.41,0l1.92-1.92c0,0,3.5,0.05,6.69-1.42c0.27-0.12,0.53-0.25,0.78-0.39 c2.32-1.12,3.59-3.72,2.68-6.19C15.06,5.32,13.13,2.57,13.13,2.57z M8.57,15.43c-0.78-0.78-0.78-2.05,0-2.83 c0.78-0.78,2.05-0.78,2.83,0c0.78,0.78,0.78,2.05,0,2.83C10.62,16.21,9.35,16.21,8.57,15.43z M18.41,18.41 c-0.39-0.39-1.02-0.39-1.41,0l-2.12,2.12c-0.39,0.39-0.39,1.02,0,1.41l0.71,0.71c0.39,0.39,1.02,0.39,1.41,0l2.12-2.12 c0.39-0.39,0.39-1.02,0-1.41L18.41,18.41z" />
                            </svg>
                        </div>
                    </>
                )}

                <div className="max-w-[430px] w-full mx-auto relative z-10 flex flex-col overflow-x-hidden min-h-[100svh] md:min-h-0">
                    <div className="md:hidden relative flex min-h-[17rem] flex-col items-center justify-end px-2 pt-6 pb-3">
                        <div className="absolute inset-x-0 top-[10%] mx-auto h-56 w-56 rounded-full bg-primary/18 blur-[85px]" />
                        <div className="absolute inset-x-0 top-[16%] mx-auto h-40 w-40 rounded-full bg-cyan-400/10 blur-[52px]" />
                        <img src="/logo.svg" alt="UniVerse Logo" className="relative z-10 w-40 object-contain animate-bounce-hop drop-shadow-[0_0_58px_rgba(79,70,229,0.92)]" />
                    </div>
                    
                    <div className="mb-4 md:mb-6 text-center md:text-left overflow-x-hidden">
                        <div className="min-h-[92px] md:h-[60px] lg:h-[130px] flex items-center justify-center md:justify-start">
                            <LoginTypewriter isSpace={isSpace} />
                        </div>
                        <p className={`mx-auto max-w-[24rem] font-bold text-[0.9rem] md:text-base lg:text-lg tracking-tight mt-1.5 md:mt-2 px-1 md:px-0 ${isSpace ? 'text-white/72' : 'text-slate-600'}`}>{t('login.subtitle')}</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-tl-2xl rounded-br-2xl text-sm font-bold border-l-4 border-red-500 shadow-sm animate-pulse break-words">
                            [ERROR] {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className={`space-y-4 md:space-y-6 rounded-[2rem] px-3 py-4 ${
                        isSpace
                            ? 'border border-white/8 bg-[#0f1022]/62 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-md md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none'
                            : 'border border-white/70 bg-white/55 shadow-[0_24px_70px_rgba(99,102,241,0.12)] backdrop-blur-xl md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none'
                    }`}>
                        <div className="space-y-1 group">
                             <label className={`text-[10px] font-black uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors ${isSpace ? 'text-white/56' : 'text-slate-500'}`}>{t('login.accessProtocol')}</label>
                             <div className="relative">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full min-w-0 text-base px-4 py-3 md:px-5 md:py-3.5 backdrop-blur-sm border rounded-tl-2xl rounded-br-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary/50 outline-none transition-all font-bold shadow-sm ${isSpace ? 'bg-[#14192d]/92 border-white/12 text-white placeholder:text-white/35 focus:bg-[#151b31]' : 'bg-white/72 border-white/80 text-slate-900 placeholder:text-slate-400 focus:bg-white'}`}
                                    placeholder="name@uni.edu"
                                    required
                                />
                             </div>
                        </div>

                        <div className="space-y-1 group">
                            <label className={`text-[10px] font-black uppercase tracking-widest ml-1 group-focus-within:text-primary transition-colors ${isSpace ? 'text-white/56' : 'text-slate-500'}`}>{t('login.securityKey')}</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className={`w-full min-w-0 text-base px-4 py-3 md:px-5 md:py-3.5 backdrop-blur-sm border rounded-tl-2xl rounded-br-2xl focus:ring-2 focus:ring-primary/10 focus:border-primary/50 outline-none transition-all font-bold shadow-sm ${isSpace ? 'bg-[#14192d]/92 border-white/12 text-white placeholder:text-white/35 focus:bg-[#151b31]' : 'bg-white/72 border-white/80 text-slate-900 placeholder:text-slate-400 focus:bg-white'}`}
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-primary ${isSpace ? 'text-white/44' : 'text-slate-400'}`}
                                >
                                    {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary text-white font-black text-sm md:text-base py-3.5 md:py-3.5 rounded-tl-3xl rounded-br-3xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2 group relative overflow-hidden border border-primary/50"
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <span className="relative z-10 flex items-center gap-2">
                                {loading ? t('login.syncing') : <><FiNavigation className="rotate-45" /> {t('login.initializeLink')}</>}
                            </span>
                        </button>
                    </form>

                    <div className={`mt-3 pt-3 md:mt-6 md:pt-6 border-t flex flex-col gap-2 md:gap-3 ${isSpace ? 'border-white/10' : 'border-slate-200/70'}`}>
                        <span className={`text-[9px] md:text-[11px] font-black uppercase tracking-widest block text-center ${isSpace ? 'text-white/48' : 'text-slate-500'}`}>{t('login.newToSystem')}</span>
                        <Link to="/register" className={`w-full font-black py-2 md:py-3.5 rounded-tl-2xl rounded-br-2xl flex items-center justify-center transition-all shadow-xl group relative overflow-hidden border ${isSpace ? 'bg-[#141a2f] text-white hover:bg-white/10 hover:border-white/30 border-white/10 shadow-black/50' : 'bg-slate-950 text-white hover:bg-primary border-white/40 shadow-[0_16px_32px_rgba(15,23,42,0.12)]'}`}>
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
