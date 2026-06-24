import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export default function GitHubRepoPicker({ onSelect, selected, loadingList }) {
  const { user } = useAuth();
  const hasGitHub = user?.authProviders?.some((p) => p.provider === 'github');

  if (!hasGitHub) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="mb-3">Link your GitHub account to see your repositories</p>
        <a
          href="/api/auth/github"
          className="inline-block bg-gray-800 text-white px-6 py-2.5 rounded-lg hover:bg-gray-900 font-medium"
        >
          Connect GitHub
        </a>
      </div>
    );
  }

  if (loadingList) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-3"></div>
        <p className="text-gray-500">Loading your repositories...</p>
      </div>
    );
  }

  if (!selected || selected.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No repositories loaded. Click "Fetch Repositories" to load.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2 max-h-96 overflow-y-auto">
      {selected.map((repo) => (
        <button
          key={repo.id}
          onClick={() => onSelect(repo)}
          className="text-left p-4 border border-gray-200 rounded-lg hover:border-primary-400 hover:bg-primary-50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{repo.name}</span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              ⭐ {repo.stars}
            </span>
          </div>
          {repo.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{repo.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>
              {repo.language}
            </span>
            {repo.private && (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded">Private</span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
