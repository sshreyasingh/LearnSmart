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
        <label htmlFor="repo-url" className="block text-sm font-semibold text-surface-700 mb-1.5">
          Repository URL
        </label>
        <input
          id="repo-url"
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/user/repo.git"
          className="input-field font-mono text-sm"
          required
        />
        <p className="text-xs text-surface-400 mt-2">
          Supports GitHub, GitLab, Bitbucket, or any public .git URL
        </p>
      </div>
      <button
        type="submit"
        disabled={loading || !url.trim()}
        className="btn-primary w-full py-3"
      >
        {loading ? 'Cloning repository...' : 'Analyze Repository'}
      </button>
    </form>
  );
}
