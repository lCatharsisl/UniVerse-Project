import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
    const [role, setRole] = useState<'student' | 'staff' | 'community'>('student');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Backend handles role lookup, but we could pass it if needed. 
            // For now, standard login.
            const loginRes = await api.post('/auth/login', { email, password });
            const { sessionToken } = loginRes.data;
            localStorage.setItem('sessionToken', sessionToken);
            const meRes = await api.get('/auth/me');
            login(sessionToken, meRes.data);
            navigate('/feed');
        } catch (err: any) {
            setError(err.response?.data?.error || 'Sign in failed. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-[440px]">
                <div className="minimal-card">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to UniVerse</h1>
                        <p className="text-sm text-gray-500">Enter your credentials to continue</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    {/* Role Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                        <button
                            type="button"
                            onClick={() => setRole('student')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Student
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('staff')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Academic
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('community')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${role === 'community' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Community
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            {/* Email Input */}
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="minimal-input"
                                placeholder={
                                    role === 'staff'
                                        ? 'name.surname@yasar.edu.tr'
                                        : 'studentNumber@stu.yasar.edu.tr'
                                }
                                required
                            />
                        </div>

                        <div className="relative">
                            {/* Password Input */}
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="minimal-input pr-10"
                                placeholder="Password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500" />
                                <span className="text-gray-500">Remember me</span>
                            </label>
                            <button type="button" className="text-blue-500 hover:text-blue-600 font-medium">
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="minimal-btn disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-blue-500 font-medium hover:text-blue-600">
                            Create one
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
