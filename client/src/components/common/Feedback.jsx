import { Link } from 'react-router-dom';

export function EmptyState({
  icon = '📂',
  title = 'Nothing here yet',
  description = '',
  action,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="text-5xl mb-5">{icon}</div>
      <h3 className="text-lg font-bold text-surface-800 mb-2">{title}</h3>
      {description && (
        <p className="text-surface-500 max-w-sm mb-6">{description}</p>
      )}
      {action && action}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message = '', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-surface-800 mb-2">{title}</h3>
      {message && <p className="text-surface-500 max-w-sm mb-6">{message}</p>}
      <div className="flex items-center gap-3">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary px-6 py-2.5">
            Try Again
          </button>
        )}
        <Link to="/dashboard" className="btn-ghost px-4 py-2.5">
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
      <svg className={`animate-spin ${sizes[size]} text-primary-600`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>
  );
}
