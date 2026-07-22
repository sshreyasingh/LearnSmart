import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-emerald-200/40 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <span className="text-sm font-bold text-surface-600">LearnSmart</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-surface-400">
            <Link to="/" className="hover:text-surface-600 transition-colors">Home</Link>
            <Link to="/login" className="hover:text-surface-600 transition-colors">Sign In</Link>
            <span className="hidden sm:inline text-surface-300">·</span>
            <span className="text-surface-400">
              &copy; {new Date().getFullYear()} LearnSmart. All rights reserved.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
