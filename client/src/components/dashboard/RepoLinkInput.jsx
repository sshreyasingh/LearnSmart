import { useState } from 'react';

export default function RepoLinkInput({ onSubmit, loading }) {
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="repo-url" className="block text-sm font-medium text-gray-700 mb-1">
          Repository URL
        </label>
        <input
          id="repo-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/user/repo.git"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none font-mono text-sm"
          required
        />
        <p className="text-xs text-gray-400 mt-1.5">
          Supports GitHub, GitLab, Bitbucket, or any public .git URL
        </p>
      </div>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="w-full bg-primary-600 text-white py-2.5 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
      >
        {loading ? 'Cloning repository...' : 'Analyze Repository'}
      </button>
    </form>
  );
}
