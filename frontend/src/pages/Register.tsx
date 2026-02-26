import React, { useState, useMemo } from 'react';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { FiUserPlus, FiArrowRight, FiShield, FiChevronDown, FiGlobe, FiCloud } from 'react-icons/fi';
import { DEPARTMENTS_DATA } from '../constants/departments';
import { useTheme } from '../context/ThemeContext';

const Register = () => {
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
            setError(err.response?.data?.error || 'Registry entry failed. Check protocols.');
        } finally {
            setLoading(false);
        }
    };

    const inputClasses = `w-full px-5 py-4 rounded-tl-2xl rounded-br-2xl outline-none font-bold transition-all focus:ring-2 focus:ring-primary/20 ${isSpace ? 'bg-[#111827]/80 text-white placeholder:text-gray-600 focus:bg-[#111827] border border-white/10' : 'bg-gray-50 text-uv-black placeholder:text-uv-gray/40 border border-transparent focus:bg-white'}`;
    const selectClasses = `w-full px-5 py-4 rounded-tl-2xl rounded-br-2xl appearance-none outline-none font-bold transition-all cursor-pointer pr-10 disabled:opacity-50 focus:ring-2 focus:ring-primary/20 ${isSpace ? 'bg-[#111827]/80 text-white border border-white/10 focus:bg-[#111827]' : 'bg-gray-50 text-uv-black border border-transparent focus:bg-white'}`;

    return (
        <div className={`min-h-screen flex flex-col md:flex-row overflow-hidden transition-colors duration-700 ${isSpace ? 'bg-[#050510]' : 'bg-white'}`}>
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
                `}
            </style>

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
                        {isSpace ? 'RESTORE GRAVITY' : 'IGNITE ENGINES'}
                    </span>
                </button>
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
                <div className="absolute bottom-10 left-10 text-white/40 font-black text-xs uppercase tracking-[0.5em] z-10">UniVerse Ecosystem v2.0</div>
            </div>

            {/* Right Side - Form */}
            <div className={`flex-1 flex flex-col justify-center px-8 md:px-24 py-16 relative overflow-y-auto transition-colors duration-700 ${isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}`}>
                <div className="max-w-[460px] w-full mx-auto">
                    <div className="md:hidden w-16 h-16 flex items-center justify-center mb-12 transform hover:scale-105 transition-transform overflow-hidden relative bg-[#050510] rounded-2xl">
                        <img src="/logo.svg" alt="UniVerse Logo" className="w-8 h-8 object-contain z-10" />
                    </div>
                    
                    <h1 className={`text-5xl md:text-6xl font-black mb-4 tracking-tighter leading-none ${isSpace ? 'text-white' : 'text-uv-black'}`}>New Node.</h1>
                    <p className={`font-bold text-lg mb-12 tracking-tight ${isSpace ? 'text-gray-400' : 'text-uv-gray'}`}>Expand the UniVerse. Select your campus role to begin.</p>

                    {success ? (
                        <div className="p-10 uv-card border-green-500/20 bg-green-50 text-green-700 text-center font-black animate-bounce rounded-tl-[3rem] rounded-br-[3rem]">
                           <FiShield size={48} className="mx-auto mb-4" />
                           NODE GENERATED SUCCESSFULLY.<br/>REDIRECTING TO LINK...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-5 bg-red-50 text-red-600 rounded-tl-2xl rounded-br-2xl text-sm font-bold border-l-4 border-red-500 shadow-sm">
                                    [SYSTEM ERROR] {error}
                                </div>
                            )}

                            {/* Role Select - Marginal Design */}
                            <div className={`flex p-1.5 rounded-tl-2xl rounded-br-2xl gap-1 border ${isSpace ? 'bg-[#111827]/80 border-white/5' : 'bg-gray-50 border-transparent'}`}>
                                {['student', 'staff', 'community'].map((r) => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setRole(r as any)}
                                        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-tl-xl rounded-br-xl transition-all ${role === r ? (isSpace ? 'bg-primary text-white shadow-lg' : 'bg-white text-primary shadow-lg shadow-black/5') : (isSpace ? 'text-gray-500 hover:text-white' : 'text-uv-gray hover:text-uv-black')}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 gap-4">
                                    <input
                                        name="email" type="email" placeholder="Campus Email"
                                        value={formData.email} onChange={handleChange}
                                        className={inputClasses}
                                        required
                                    />
                                    <input
                                        name="password" type="password" placeholder="Passkey (Min 8 chars)"
                                        value={formData.password} onChange={handleChange}
                                        className={inputClasses}
                                        required minLength={8}
                                    />
                                </div>

                                {role === 'student' && (
                                    <div className={`space-y-4 pt-4 border-t mt-2 ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input name="studentName" placeholder="Name" className={inputClasses} onChange={handleChange} required />
                                            <input name="studentSurname" placeholder="Surname" className={inputClasses} onChange={handleChange} required />
                                        </div>
                                        <div className="space-y-4">
                                            <input name="studentNumber" placeholder="Student ID Number" className={inputClasses} onChange={handleChange} required />
                                            
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
                                                        <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>Select Faculty</option>
                                                        {Object.keys(DEPARTMENTS_DATA).map(faculty => (
                                                            <option key={faculty} value={faculty} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{faculty}</option>
                                                        ))}
                                                    </select>
                                                    <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`} />
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
                                                        <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>Select Department</option>
                                                        {availableDepartments.map(dept => (
                                                            <option key={dept.id} value={dept.id} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{dept.name}</option>
                                                        ))}
                                                    </select>
                                                    <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {role === 'staff' && (
                                    <div className={`space-y-4 pt-4 border-t mt-2 ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input name="staffName" placeholder="Name" className={inputClasses} onChange={handleChange} required />
                                            <input name="staffSurname" placeholder="Surname" className={inputClasses} onChange={handleChange} required />
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
                                                    <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>Select Faculty</option>
                                                    {Object.keys(DEPARTMENTS_DATA).map(faculty => (
                                                        <option key={faculty} value={faculty} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{faculty}</option>
                                                    ))}
                                                </select>
                                                <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`} />
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
                                                    <option value="" className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>Select Department</option>
                                                    {availableDepartments.map(dept => (
                                                        <option key={dept.id} value={dept.id} className={isSpace ? 'bg-[#0a0a1a]' : 'bg-white'}>{dept.name}</option>
                                                    ))}
                                                </select>
                                                <FiChevronDown className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`} />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {role === 'community' && (
                                    <div className={`space-y-4 pt-4 border-t mt-2 ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
                                        <input name="communityName" placeholder="Organization Name" className={inputClasses} onChange={handleChange} required />
                                        <textarea name="description" placeholder="Mission statement..." className={`${inputClasses} min-h-[100px] py-4`} onChange={handleChange} />
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit" disabled={loading}
                                className="w-full bg-accent text-white font-black py-5 rounded-tl-[2rem] rounded-br-[2rem] shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-8 flex items-center justify-center gap-2 border border-accent/50 group relative overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                                <span className="relative z-10 flex items-center gap-2">
                                    {loading ? 'REGISTRY IN PROGRESS...' : <><FiUserPlus /> GENERATE NODE</>}
                                </span>
                            </button>
                        </form>
                    )}

                    <div className={`mt-12 pt-10 border-t flex items-center justify-center ${isSpace ? 'border-white/10' : 'border-gray-100'}`}>
                        <Link to="/login" className={`text-xs font-black uppercase tracking-widest hover:text-primary transition-colors flex items-center gap-2 ${isSpace ? 'text-gray-500' : 'text-uv-gray'}`}>
                            Return to access terminal <FiArrowRight />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
