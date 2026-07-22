import { Link } from 'react-router-dom';

export function EmptyState({ icon, title = 'Nothing here yet', description = '', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 sm:py-20 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 bg-surface-100 rounded-3xl flex items-center justify-center mb-6">
        {icon || (
          <svg className="w-10 h-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        )}
      </div>
      <h3 className="text-xl font-bold text-surface-800 mb-2">{title}</h3>
      {description && <p className="text-surface-500 max-w-sm mb-8 text-sm leading-relaxed">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message = '', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-fade-in">
      <div className="w-20 h-20 bg-red-100 rounded-3xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-surface-800 mb-2">{title}</h3>
      {message && <p className="text-surface-500 max-w-sm mb-8 text-sm leading-relaxed">{message}</p>}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary px-6 py-2.5 text-sm">
            Try Again
          </button>
        )}
        <Link to="/dashboard" className="btn-ghost px-4 py-2.5 text-sm">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' };
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg className={`animate-spin ${sizes[size]} text-primary-500`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" />
        <path className="opacity-80" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}
