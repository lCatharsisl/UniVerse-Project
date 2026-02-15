import React, { useState } from 'react';
import api from '../api/client';
import { useNavigate, Link } from 'react-router-dom';

const Register = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState<'student' | 'staff' | 'community'>('student');
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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simple validation
        if (role === 'student' && !formData.email.endsWith('@stu.yasar.edu.tr')) {
            setError('Student email must end with @stu.yasar.edu.tr');
            setLoading(false);
            return;
        }
        // Check if email matches student number for students
        if (role === 'student') {
            const emailPrefix = formData.email.split('@')[0];
            if (emailPrefix !== formData.studentNumber) {
                setError('Öğrenci numaranız mail adresinizle eşleşmiyor. Mail adresindeki numara ile Öğrenci Numarası alanı aynı olmalıdır.');
                setLoading(false);
                return;
            }
        }
        if (role === 'staff' && !formData.email.endsWith('@yasar.edu.tr')) {
            setError('Staff email must end with @yasar.edu.tr');
            setLoading(false);
            return;
        }
        if (role === 'community') {
            const communityEmailRegex = /^\d+@stu\.yasar\.edu\.tr$/;
            if (!communityEmailRegex.test(formData.email)) {
                setError('Community email must be student number + @stu.yasar.edu.tr (e.g. 21060001001@stu.yasar.edu.tr)');
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
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-[500px]">
                <div className="minimal-card">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Create Account</h1>
                        <p className="text-sm text-gray-500">Join UniVerse today</p>
                    </div>

                    {success ? (
                        <div className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-lg text-center">
                            Successfully registered! Redirecting...
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-center">{error}</div>}

                            {/* Role Selection Tabs */}
                            <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                                {['student', 'staff', 'community'].map((r) => (
                                    <button
                                        type="button"
                                        key={r}
                                        onClick={() => setRole(r as any)}
                                        className={`flex-1 py-2 text-sm font-medium rounded-md capitalize transition-all ${role === r
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                <input
                                    name="email"
                                    type="email"
                                    placeholder={
                                        role === 'staff'
                                            ? 'name.surname@yasar.edu.tr'
                                            : 'studentNumber@stu.yasar.edu.tr'
                                    }
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="minimal-input"
                                    required
                                />

                                <input
                                    name="password"
                                    type="password"
                                    placeholder="Password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="minimal-input"
                                    required
                                    minLength={8}
                                />

                                {role === 'student' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                name="studentName"
                                                placeholder="Name"
                                                className="minimal-input"
                                                onChange={handleChange} required
                                            />
                                            <input
                                                name="studentSurname"
                                                placeholder="Surname"
                                                className="minimal-input"
                                                onChange={handleChange} required
                                            />
                                        </div>
                                        <input
                                            name="studentNumber"
                                            placeholder="Student Number"
                                            className="minimal-input"
                                            onChange={handleChange} required
                                        />
                                        <input
                                            name="departmentId"
                                            type="number"
                                            placeholder="Department ID (e.g. 1)"
                                            className="minimal-input"
                                            onChange={handleChange} required
                                        />
                                    </>
                                )}

                                {role === 'staff' && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input
                                                name="staffName"
                                                placeholder="Name"
                                                className="minimal-input"
                                                onChange={handleChange} required
                                            />
                                            <input
                                                name="staffSurname"
                                                placeholder="Surname"
                                                className="minimal-input"
                                                onChange={handleChange} required
                                            />
                                        </div>
                                        <input
                                            name="departmentId"
                                            type="number"
                                            placeholder="Department ID"
                                            className="minimal-input"
                                            onChange={handleChange} required
                                        />
                                    </>
                                )}

                                {role === 'community' && (
                                    <>
                                        <input
                                            name="communityName"
                                            placeholder="Community Name"
                                            className="minimal-input"
                                            onChange={handleChange} required
                                        />
                                        <textarea
                                            name="description"
                                            placeholder="Description"
                                            className="minimal-input min-h-[100px] resize-none"
                                            onChange={handleChange}
                                        />
                                    </>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="minimal-btn mt-6 disabled:opacity-70"
                            >
                                {loading ? 'Creating Account...' : 'Sign Up'}
                            </button>
                        </form>
                    )}

                    <div className="mt-8 text-center text-sm text-gray-500">
                        Already have an account?{' '}
                        <Link to="/login" className="text-blue-500 font-medium hover:text-blue-600">
                            Sign In
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
