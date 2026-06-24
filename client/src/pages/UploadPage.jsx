import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadProjectZip, uploadProjectFromGitHub, uploadProjectFromUrl, getGitHubRepos } from '../api/project.api';
import GitHubRepoPicker from '../components/dashboard/GitHubRepoPicker';
import RepoLinkInput from '../components/dashboard/RepoLinkInput';

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
  const [selectedRepo, setSelectedRepo] = useState(null);
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
    setSelectedRepo(repo);
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
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-700 font-medium">Cloning repository...</p>
        <p className="text-sm text-gray-500 mt-1">
          Once ready, it will appear on your dashboard and analysis will begin automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Upload Source Code</h1>
      <p className="text-gray-500 mb-8">Choose how you want to provide your project for analysis</p>

      <div className="flex border-b border-gray-200 mb-8">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
      )}

      {tab === 'github' && (
        <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Select a GitHub Repository</h2>
            <button
              onClick={fetchRepos}
              disabled={loadingRepos}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              {loadingRepos ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>
          {repoError && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{repoError}</div>
          )}
          <GitHubRepoPicker
            selected={repos}
            loadingList={loadingRepos}
            onSelect={handleGitHubSelect}
          />
        </div>
      )}

      {tab === 'zip' && (
        <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
          <form onSubmit={handleZipUpload}>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
                dragOver ? 'border-primary-500 bg-primary-50/60' : 'border-gray-200'
              } ${zipFile ? 'bg-green-50 border-green-400' : ''}`}
            >
              {zipFile ? (
                <div>
                  <span className="text-4xl">📦</span>
                  <p className="text-lg font-semibold text-gray-900 mt-3">{zipFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {(zipFile.size / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => setZipFile(null)}
                    className="text-sm text-red-500 hover:text-red-600 mt-2"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <span className="text-5xl">📂</span>
                  <p className="text-lg font-semibold text-gray-700 mt-4">
                    Drag & drop your ZIP file here
                  </p>
                  <p className="text-sm text-gray-500 mt-1">or</p>
                  <label className="inline-block mt-3 cursor-pointer bg-white border border-gray-300 px-5 py-2.5 rounded-lg hover:bg-gray-50 font-medium text-gray-700">
                    Browse Files
                    <input type="file" accept=".zip" onChange={handleFileChange} className="hidden" />
                  </label>
                  <p className="text-xs text-gray-400 mt-3">Max 50MB</p>
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !zipFile}
              className="w-full mt-6 bg-gradient-to-r from-primary-600 to-primary-700 text-white py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:shadow-none transition-all"
            >
              Upload & Analyze
            </button>
          </form>
        </div>
      )}

      {tab === 'url' && (
        <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Clone from URL</h2>
          <RepoLinkInput onSubmit={handleUrlSubmit} loading={loading} />
        </div>
      )}
    </div>
  );
}
