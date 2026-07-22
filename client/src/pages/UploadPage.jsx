import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadProjectZip, uploadProjectFromGitHub, uploadProjectFromUrl, getGitHubRepos } from '../api/project.api';
import GitHubRepoPicker from '../components/dashboard/GitHubRepoPicker';
import RepoLinkInput from '../components/dashboard/RepoLinkInput';
import { Spinner } from '../components/common/Feedback';

const TABS = [
  { id: 'github', label: 'GitHub Repo', icon: '🔗' },
  { id: 'zip', label: 'Upload ZIP', icon: '📦' },
  { id: 'url', label: 'Repository URL', icon: '🌐' },
];

export default function UploadPage() {
  const [tab, setTab] = useState('github');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [repos, setRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [repoError, setRepoError] = useState('');
  const navigate = useNavigate();

  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true);
    setRepoError('');
    try {
      const res = await getGitHubRepos();
      setRepos(res.data.data.repos);
    } catch (err) {
      setRepoError(err.response?.data?.message || 'Failed to load repositories');
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  useEffect(() => {
    if (tab === 'github') fetchRepos();
  }, [tab, fetchRepos]);

  const handleGitHubSelect = async (repo) => {
    setError('');
    setLoading(true);
    try {
      const [owner, repoName] = repo.fullName.split('/');
      const res = await uploadProjectFromGitHub(owner, repoName, repoName);
      navigate(`/projects/${res.data.data.project._id}?force=true`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to analyze repository');
      setLoading(false);
    }
  };

  const handleUrlSubmit = async (url) => {
    setError('');
    setLoading(true);
    try {
      const name = url.split('/').pop()?.replace('.git', '') || 'repo';
      const res = await uploadProjectFromUrl(url, name);
      navigate(`/projects/${res.data.data.project._id}?force=true`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to clone repository');
      setLoading(false);
    }
  };

  const handleZipUpload = async (e) => {
    e.preventDefault();
    if (!zipFile) {
      setError('Please select a ZIP file');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', zipFile);
      formData.append('uploadMethod', 'zip');
      formData.append('projectName', zipFile.name.replace(/\.zip$/i, ''));
      const res = await uploadProjectZip(formData);
      navigate(`/projects/${res.data.data.project._id}?force=true`);
    } catch (err) {
      setError(err.response?.data?.message || 'Upload failed');
      setLoading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.zip')) {
      setZipFile(file);
      setError('');
    } else {
      setError('Only .zip files are accepted');
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setZipFile(file);
      setError('');
    }
  };

  if (loading) {
    return (
      <div className="page-container max-w-xl mx-auto text-center">
        <Spinner size="lg" />
        <p className="text-surface-700 font-medium mt-4">Cloning repository...</p>
        <p className="text-sm text-surface-500 mt-1">
          Once ready, it will appear on your dashboard and analysis will begin automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="page-container max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-surface-900 mb-2">Upload Source Code</h1>
        <p className="text-surface-500">Choose how you want to provide your project for analysis</p>
      </div>

      <div className="flex border-b border-surface-200 mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(''); }}
            className={`flex items-center gap-2 px-6 py-3.5 font-semibold text-sm border-b-2 transition-all duration-200 ${
              tab === t.id
                ? 'border-primary-600 text-primary-400'
                : 'border-transparent text-surface-400 hover:text-surface-600 hover:border-surface-300'
            }`}
          >
            <span className="text-lg">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/15 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-6 text-sm animate-fade-in">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {tab === 'github' && (
        <div className="section-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-surface-900">Select a GitHub Repository</h2>
            <button
              onClick={fetchRepos}
              disabled={loadingRepos}
              className="btn-ghost px-3 py-1.5 text-sm"
            >
              {loadingRepos ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>
          {repoError && (
            <div className="flex items-center gap-2 bg-red-900/15 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl mb-4 text-sm">
              {repoError}
            </div>
          )}
          <GitHubRepoPicker
            selected={repos}
            loadingList={loadingRepos}
            onSelect={handleGitHubSelect}
          />
        </div>
      )}

      {tab === 'zip' && (
        <div className="section-card">
          <form onSubmit={handleZipUpload}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
                dragOver
                  ? 'border-primary-400 bg-primary-500/10/60 scale-[1.01]'
                  : zipFile
                    ? 'border-emerald-400 bg-primary-500/10/50'
                    : 'border-surface-200 hover:border-surface-300'
              }`}
            >
              {zipFile ? (
                <div className="animate-fade-in">
                  <div className="w-16 h-16 bg-primary-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-surface-900">{zipFile.name}</p>
                  <p className="text-sm text-surface-500 mt-1">
                    {(zipFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={() => setZipFile(null)}
                    className="btn-danger px-3 py-1.5 text-sm mt-3"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-lg font-semibold text-surface-700">
                    Drag & drop your ZIP file here
                  </p>
                  <p className="text-sm text-surface-500 mt-1">or</p>
                  <label className="inline-block mt-4 cursor-pointer btn-secondary px-5 py-2.5">
                    Browse Files
                    <input type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
                  </label>
                  <p className="text-xs text-surface-400 mt-3">Max 50MB</p>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !zipFile}
              className="btn-primary w-full mt-6 py-3"
            >
              Upload & Analyze
            </button>
          </form>
        </div>
      )}

      {tab === 'url' && (
        <div className="section-card">
          <h2 className="text-lg font-bold text-surface-900 mb-5">Clone from URL</h2>
          <RepoLinkInput onSubmit={handleUrlSubmit} loading={loading} />
        </div>
      )}
    </div>
  );
}
