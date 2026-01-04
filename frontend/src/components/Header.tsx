import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiHome, FiLogOut, FiUser, FiPlusCircle } from 'react-icons/fi';

const Header = () => {
    const { user, logout } = useAuth();
    const location = useLocation();

    const isActive = (path: string) => location.pathname === path;

    return (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/feed" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                            U
                        </div>
                        <span className="font-bold text-xl text-gray-900 hidden sm:block">
                            Uni<span className="text-blue-600">Verse</span>
                        </span>
                    </Link>

                    {/* Navigation */}
                    {user && (
                        <nav className="flex items-center gap-1">
                            <Link
                                to="/feed"
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/feed')
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <FiHome size={16} />
                                <span className="hidden sm:inline">Feed</span>
                            </Link>

                            <Link
                                to="/create-item"
                                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/create-item')
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <FiPlusCircle size={16} />
                                <span className="hidden sm:inline">Post Item</span>
                            </Link>
                        </nav>
                    )}

                    {/* User Menu */}
                    {user && (
                        <div className="flex items-center gap-4">
                            <div className="hidden md:flex items-center gap-2 text-sm text-gray-700">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                                    <FiUser size={14} />
                                </div>
                                <span className="font-medium">{user.email.split('@')[0]}</span>
                            </div>
                            <button
                                onClick={logout}
                                className="text-gray-400 hover:text-red-600 transition-colors"
                                title="Logout"
                            >
                                <FiLogOut size={18} />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
