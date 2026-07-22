import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function NavLink({ to, children, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
        isActive
          ? 'text-primary-400 bg-primary-500/10'
          : 'text-surface-500 hover:text-surface-800 hover:bg-surface-200'
      }`}
    >
      {children}
    </Link>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="bg-surface-50/90 backdrop-blur-lg shadow-sm border-b border-surface-300/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-400 rounded-lg flex items-center justify-center shadow-glow group-hover:shadow-lg transition-shadow">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              LearnSmart
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <NavLink to="/dashboard">Dashboard</NavLink>
                <NavLink to="/upload">Upload</NavLink>
                <div className="ml-3 pl-3 border-l border-surface-300/60 flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-sm font-bold text-primary-400">
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="text-sm font-medium text-surface-600 hidden lg:inline">
                      {user.name}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="text-surface-500 hover:text-red-400 text-sm font-medium transition-colors px-2 py-1"
                  >
                    Logout
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-surface-500 hover:text-surface-800 font-medium text-sm px-4 py-2 rounded-lg hover:bg-surface-200 transition-all">
                  Sign In
                </Link>
                <Link to="/register" className="ml-2 btn-primary px-5 py-2 text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-200 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-surface-300/50 bg-surface-50/95 backdrop-blur-lg animate-fade-in">
          <div className="px-4 py-4 space-y-1">
            {user ? (
              <>
                <div className="flex items-center gap-3 px-3 py-2 mb-2">
                  <div className="w-10 h-10 bg-primary-500/20 rounded-full flex items-center justify-center text-lg font-bold text-primary-400">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-surface-800">{user.name}</p>
                    <p className="text-xs text-surface-500">{user.email}</p>
                  </div>
                </div>
                <NavLink to="/dashboard" onClick={closeMobile}>Dashboard</NavLink>
                <NavLink to="/upload" onClick={closeMobile}>Upload</NavLink>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={closeMobile} className="block px-3 py-2 text-sm font-medium text-surface-500 hover:text-surface-800 rounded-lg hover:bg-surface-200">
                  Sign In
                </Link>
                <Link to="/register" onClick={closeMobile} className="block btn-primary text-center py-2.5 mt-2 text-sm">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
