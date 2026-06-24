import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className="bg-[#D1F0E1]/80 backdrop-blur-md shadow-sm border-b border-emerald-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2 group">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent group-hover:from-primary-700 group-hover:to-accent-700 transition-all">
              LearnSmart
            </span>
          </Link>
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link to="/dashboard" className="text-gray-600 hover:text-primary-600 font-medium text-sm transition-colors">
                  Dashboard
                </Link>
                <span className="text-gray-400 text-sm">
                  {user.name}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-gray-400 hover:text-red-500 text-sm font-medium transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-primary-600 font-medium text-sm transition-colors">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-5 py-2.5 rounded-lg hover:from-primary-700 hover:to-primary-800 font-medium text-sm shadow-md shadow-primary-500/20 transition-all hover:shadow-lg hover:shadow-primary-500/30"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
