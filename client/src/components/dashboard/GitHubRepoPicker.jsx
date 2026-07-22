import { useAuth } from '../../context/AuthContext';
import { Spinner } from '../common/Feedback';

const RAW_URL = import.meta.env.VITE_API_URL || '';
const API_URL = RAW_URL.replace(/\/api\/?$/, '');

export default function GitHubRepoPicker({ onSelect, selected, loadingList }) {
  const { user } = useAuth();
  const hasGitHub = user?.authProviders?.some((p) => p.provider === 'github');

  if (!hasGitHub) {
    return (
      <div className="text-center py-10">
        <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-surface-400" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
        </div>
        <p className="text-surface-500 mb-4">Link your GitHub account to see your repositories</p>
        <a
          href={`${API_URL}/api/auth/github`}
          className="btn-primary inline-flex px-8 py-3"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          Connect GitHub
        </a>
      </div>
    );
  }

  if (loadingList) {
    return (
      <div className="text-center py-10">
        <Spinner size="md" />
        <p className="text-surface-500 mt-4">Loading your repositories...</p>
      </div>
    );
  }

  if (!selected || selected.length === 0) {
    return (
      <div className="text-center py-10 text-surface-500">
        <p>No repositories loaded. Click "Refresh" to fetch.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 max-h-96 overflow-y-auto scrollbar-thin pr-1">
      {selected.map((repo) => (
        <button
          key={repo.id}
          onClick={() => onSelect(repo)}
          className="text-left p-4 bg-white border border-surface-200 rounded-xl hover:border-primary-300 hover:shadow-soft transition-all duration-200 group"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-surface-900 group-hover:text-primary-700 transition-colors">{repo.name}</span>
            <span className="text-xs text-surface-400 flex items-center gap-1">
              <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {repo.stars}
            </span>
          </div>
          {repo.description && (
            <p className="text-sm text-surface-500 mt-1.5 line-clamp-2">{repo.description}</p>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-surface-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              {repo.language || 'Unknown'}
            </span>
            {repo.private && (
              <span className="px-2 py-0.5 bg-surface-100 rounded-md font-medium">Private</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
