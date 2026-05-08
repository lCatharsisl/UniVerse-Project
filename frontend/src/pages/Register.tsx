/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { FiUserPlus, FiArrowRight, FiShield, FiChevronDown, FiMoon, FiCloud } from 'react-icons/fi';
import { DEPARTMENTS_DATA } from '../constants/departments';
import { useTheme } from '../context/ThemeContext';
import LanguageSwitch from '../components/LanguageSwitch';

const Register = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { dimension, toggleDimension } = useTheme();
    const isSpace = dimension === 'space';

    const [role, setRole] = useState<'student' | 'staff' | 'community'>('student');
    const [selectedFaculty, setSelectedFaculty] = useState('');
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        studentNumber: '',
        studentName: '',
        studentSurname: '',
        departmentId: '',
        staffName: '',
        staffSurname: '',
        communityName: '',
        description: '',
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    // Filtered departments based on selected faculty
    const availableDepartments = useMemo(() => {
        if (!selectedFaculty) return [];
        return DEPARTMENTS_DATA[selectedFaculty as keyof typeof DEPARTMENTS_DATA] || [];
    }, [selectedFaculty]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        const email = formData.email.toLowerCase();

        // Email validation
        if (role === 'student' || role === 'community') {
            if (!email.endsWith('@stu.yasar.edu.tr')) {
                setError(t('register.studentEmailError'));
                setLoading(false);
                return;
            }
            if (role === 'student') {
                const emailPrefix = email.split('@')[0];
                if (emailPrefix !== formData.studentNumber) {
                    setError(t('register.emailFormatError'));
                    setLoading(false);
                    return;
                }
            }
        } else if (role === 'staff') {
            if (!email.endsWith('@yasar.edu.tr') || email.endsWith('@stu.yasar.edu.tr')) {
                setError(t('register.staffEmailError'));
                setLoading(false);
                return;
            }
        }

        try {
            const payload = {
                role,
                email: formData.email,
                password: formData.password,
                ...(role === 'student' && {
                    studentNumber: formData.studentNumber,
                    studentName: formData.studentName,
                    studentSurname: formData.studentSurname,
                    departmentId: parseInt(formData.departmentId),
                }),
                ...(role === 'staff' && {
                    staffName: formData.staffName,
                    staffSurname: formData.staffSurname,
                    departmentId: parseInt(formData.departmentId),
                }),
                ...(role === 'community' && {
                    communityName: formData.communityName,
                    description: formData.description,
                })
            };

            await api.post('/auth/register', payload);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err: any) {
            setError(err.response?.data?.error || t('register.registryError'));
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = `w-full px-5 py-3 md:py-4 rounded-tl-xl rounded-br-xl outline-none font-bold transition-all focus:ring-2 focus:ring-primary/20 text-base ${isSpace ? 'bg-[#14192d]/92 text-white placeholder:text-white/35 focus:bg-[#151b31] border border-white/12' : 'bg-white/72 text-slate-900 placeholder:text-slate-400 border border-white/80 focus:bg-white'}`;
    const selectClasses = `w-full px-5 py-3 md:py-4 rounded-tl-xl rounded-br-xl appearance-none outline-none font-bold transition-all cursor-pointer pr-10 disabled:opacity-50 focus:ring-2 focus:ring-primary/20 text-base ${isSpace ? 'bg-[#14192d]/92 text-white border border-white/12 focus:bg-[#151b31]' : 'bg-white/72 text-slate-900 border border-white/80 focus:bg-white'}`;

    return (
        <div className={`min-h-[100svh] md:min-h-screen flex flex-col md:flex-row overflow-x-hidden transition-colors duration-700 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
            <style>
                {`
                    @keyframes bounce-hop {
                        0%, 100% { transform: translateY(0); }
                        50% { transform: translateY(-15px); }
                    }
                    .animate-bounce-hop {
                        animation: bounce-hop 2s infinite ease-in-out;
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
                `}
            </style>

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
            <div className="hidden md:flex flex-1 bg-[#050510] items-center justify-center p-20 select-none relative overflow-hidden transition-colors duration-700">
                {/* Space Elements */}
                <div className="nebula" />
                <div className="stars-layer" />
                <div className="stars-layer stars-layer-fast" />

                {/* Decorative Planets */}
                <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-800 opacity-40 blur-[2px] animate-float shadow-[0_0_50px_rgba(255,100,0,0.2)]" />
                <div className="absolute bottom-40 left-20 w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-indigo-900 opacity-30 blur-[1px] animate-float-delayed" />
                <div className="absolute top-1/2 left-10 w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-purple-900 opacity-20 animate-float" />
                
                {/* Rocket */}
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

            {/* Right Side - Form */}
            <div className={`flex-1 flex flex-col justify-start md:justify-center px-5 sm:px-6 md:px-24 pt-[max(env(safe-area-inset-top,0px),0.75rem)] pb-[max(env(safe-area-inset-bottom,0px),1rem)] md:py-16 relative overflow-x-hidden overflow-y-auto transition-colors duration-700 ${isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `radial-gradient(${isSpace ? '#ffffff' : '#050510'} 1px, transparent 1px)`, backgroundSize: '40px 40px' }} />
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
                    </>
                )}

                <div className="max-w-[460px] w-full mx-auto min-h-[100svh] md:min-h-0 overflow-x-hidden relative z-10">
                    <div className="md:hidden relative flex min-h-[17rem] flex-col items-center justify-end px-2 pt-7 pb-4">
                        <div className="absolute inset-x-0 top-[10%] mx-auto h-48 w-48 rounded-full bg-primary/18 blur-[78px]" />
                        <div className="absolute inset-x-0 top-[16%] mx-auto h-32 w-32 rounded-full bg-cyan-400/10 blur-[46px]" />
                        <img src="/logo.svg" alt="UniVerse Logo" className="w-40 h-40 object-contain animate-bounce-hop drop-shadow-[0_0_58px_rgba(79,70,229,0.92)]" />
                    </div>
                    
                    <h1 className={`text-[clamp(2.2rem,8.8vw,3.8rem)] md:text-6xl font-black mb-1 tracking-[-0.06em] leading-[0.95] text-center md:text-left ${isSpace ? 'text-white' : 'text-slate-950'}`}>{t('register.title')}</h1>
                    <p className={`mx-auto md:mx-0 max-w-[24rem] font-bold text-[0.92rem] md:text-lg mb-4 md:mb-12 tracking-tight text-center md:text-left ${isSpace ? 'text-white/72' : 'text-slate-600'}`}>{t('register.subtitle')}</p>

                    {success ? (
                        <div className="p-10 uv-card border-green-500/20 bg-green-50 text-green-700 text-center font-black animate-bounce rounded-tl-[3rem] rounded-br-[3rem]">
                           <FiShield size={48} className="mx-auto mb-4" />
                           {t('register.nodeGenerated')}<br/>{t('register.redirecting')}
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={`space-y-4 md:space-y-6 rounded-[2rem] px-3 py-4 ${
                            isSpace
                                ? 'border border-white/8 bg-[#0f1022]/62 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-md md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none'
                                : 'border border-white/70 bg-white/55 shadow-[0_24px_70px_rgba(99,102,241,0.12)] backdrop-blur-xl md:border-0 md:bg-transparent md:px-0 md:py-0 md:shadow-none'
                        }`}>
                            {error && (
                                <div className="p-5 bg-red-50 text-red-600 rounded-tl-2xl rounded-br-2xl text-sm font-bold border-l-4 border-red-500 shadow-sm">
                                    [SYSTEM ERROR] {error}
                                </div>
                            )}

                            {/* Role Select - Marginal Design */}
                            <div className={`flex p-1 rounded-tl-xl rounded-br-xl gap-1 border ${isSpace ? 'bg-[#14192d]/92 border-white/8' : 'bg-white/72 border-white/80'}`}>
                                {['student', 'staff', 'community'].map((r) => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setRole(r as any)}
                                        className={`flex-1 py-2 text-[9px] font-black uppercase tracking-widest rounded-tl-lg rounded-br-lg transition-all ${role === r ? (isSpace ? 'bg-primary text-white shadow-lg' : 'bg-white text-primary shadow-lg shadow-black/5') : (isSpace ? 'text-white/46 hover:text-white' : 'text-slate-500 hover:text-slate-950')}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-2">
                                    <input
                                        name="email" type="email"
                                        placeholder={role === 'staff' ? t('register.staffEmailPlaceholder') : t('register.campusEmail')}
                                        value={formData.email} onChange={handleChange}
                                        className={`${inputClasses} py-3 text-sm`}
                                        required
                                    />
                                    <input
                                        name="password" type="password" placeholder={t('register.passkey')}
                                        value={formData.password} onChange={handleChange}
                                        className={`${inputClasses} py-3 text-sm`}
                                        required minLength={8}
                                    />
                                </div>

                                {role === 'student' && (
                                    <div className={`space-y-4 pt-4 border-t mt-2 ${isSpace ? 'border-white/10' : 'border-slate-200/70'}`}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input name="studentName" placeholder={t('register.name')} className={inputClasses} onChange={handleChange} required />
                                            <input name="studentSurname" placeholder={t('register.surname')} className={inputClasses} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-4">
                                            <input name="studentNumber" placeholder={t('register.studentIdNumber')} className={inputClasses} onChange={handleChange} required />
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <select 
                                                        value={selectedFaculty}
                                                        onChange={(e) => {
                                                            setSelectedFaculty(e.target.value);
                                                            setFormData({ ...formData, departmentId: '' });
                                                        }}
                                                        className={selectClasses}
                                                        required
                                                    >
                                                        <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t('register.selectFaculty')}</option>
                                                        {Object.keys(DEPARTMENTS_DATA).map(faculty => (
                                                            <option key={faculty} value={faculty} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t(`departments.faculties.${faculty}`) || faculty}</option>
                                                        ))}
                                                    </select>
                                                    <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-white/44' : 'text-slate-400'}`} />
                                                </div>

                                                <div className="relative">
                                                    <select 
                                                        name="departmentId"
                                                        value={formData.departmentId}
                                                        onChange={handleChange}
                                                        disabled={!selectedFaculty}
                                                        className={selectClasses}
                                                        required
                                                    >
                                                        <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t('register.selectDepartment')}</option>
                                                        {availableDepartments.map(dept => (
                                                            <option key={dept.id} value={dept.id} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t(`departments.departments.${dept.name}`) || dept.name}</option>
                                                        ))}
                                                    </select>
                                                    <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-white/44' : 'text-slate-400'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {role === 'staff' && (
                                    <div className={`space-y-4 pt-4 border-t mt-2 ${isSpace ? 'border-white/10' : 'border-slate-200/70'}`}>
                                        <p className={`text-[10px] md:text-xs font-bold leading-relaxed ${isSpace ? 'text-white/72' : 'text-slate-600'}`}>
                                            {t('register.staffDirectoryHint')}
                                        </p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input name="staffName" placeholder={t('register.staffNamePlaceholder')} className={inputClasses} onChange={handleChange} required />
                                            <input name="staffSurname" placeholder={t('register.staffSurnamePlaceholder')} className={inputClasses} onChange={handleChange} required />
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="relative">
                                                <select 
                                                    value={selectedFaculty}
                                                    onChange={(e) => {
                                                        setSelectedFaculty(e.target.value);
                                                        setFormData({ ...formData, departmentId: '' });
                                                    }}
                                                    className={selectClasses}
                                                    required
                                                >
                                                    <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t('register.selectFaculty')}</option>
                                                    {Object.keys(DEPARTMENTS_DATA).map(faculty => (
                                                        <option key={faculty} value={faculty} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t(`departments.faculties.${faculty}`) || faculty}</option>
                                                    ))}
                                                </select>
                                                <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-white/44' : 'text-slate-400'}`} />
                                            </div>

                                            <div className="relative">
                                                <select 
                                                    name="departmentId"
                                                    value={formData.departmentId}
                                                    onChange={handleChange}
                                                    disabled={!selectedFaculty}
                                                    className={selectClasses}
                                                    required
                                                >
                                                    <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t('register.selectDepartment')}</option>
                                                    {availableDepartments.map(dept => (
                                                        <option key={dept.id} value={dept.id} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{t(`departments.departments.${dept.name}`) || dept.name}</option>
                                                    ))}
                                                </select>
                                                <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-white/44' : 'text-slate-400'}`} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {role === 'community' && (
                                    <div className={`space-y-4 pt-4 border-t mt-2 ${isSpace ? 'border-white/10' : 'border-slate-200/70'}`}>
                                        <input name="communityName" placeholder={t('register.organizationName')} className={inputClasses} onChange={handleChange} required />
                                        <textarea name="description" placeholder={t('register.missionStatement')} className={`${inputClasses} min-h-[100px] py-4`} onChange={handleChange} />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-accent text-white font-black py-3 md:py-5 rounded-tl-[1.5rem] rounded-br-[1.5rem] shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 md:mt-8 flex items-center justify-center gap-2 border border-accent/50 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 flex items-center gap-2 text-sm">
                                    {loading ? t('register.registryInProgress') : <><FiUserPlus /> {t('register.generateNode')}</>}
                                </span>
                            </button>
                        </form>
                    )}

                    <div className={`mt-5 pt-3 md:mt-12 md:pt-10 border-t flex items-center justify-center ${isSpace ? 'border-white/10' : 'border-slate-200/70'}`}>
                        <Link to="/login" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 ${isSpace ? 'text-white/48' : 'text-slate-500'}`}>
                            {t('register.returnToAccess')} <FiArrowRight />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
