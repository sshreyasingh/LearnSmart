import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../api/project.api';
import DifficultyAnalysisSection from '../components/dashboard/DifficultyAnalysisSection';
import { DashboardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/Feedback';

const STATUS_STYLES = {
  completed: 'badge-success',
  failed: 'badge-error',
  processing: 'badge-warning',
  queued: 'badge-info',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data.data.projects);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {
      setError('Failed to delete project');
    }
  };

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <Link to="/upload" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload Project
        </Link>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-sm">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {projects.length === 0 ? (
        <div className="card-elevated">
          <EmptyState
            icon="📂"
            title="No projects yet"
            description="Upload source code to get AI-powered analysis of any codebase."
            action={
              <Link to="/upload" className="btn-primary px-6 py-3">
                Upload Your First Project
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          <DifficultyAnalysisSection projects={projects} />

          <div>
            <h2 className="text-lg font-bold text-surface-900 mb-4">Analyzed Projects</h2>
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="card-elevated p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="min-w-0">
                    <h3 className="text-lg font-bold text-surface-900 truncate">{project.projectName}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-surface-500">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        {project.fileCount} files
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        {project.totalLOC?.toLocaleString()} LOC
                      </span>
                      <span className={STATUS_STYLES[project.status] || 'badge-info'}>
                        {project.status}
                      </span>
                    </div>
                    {project.detectedTechStack?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {project.detectedTechStack.map((tech) => (
                          <span key={tech} className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-lg text-xs font-semibold border border-primary-100">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link
                      to={`/projects/${project._id}`}
                      className="btn-primary px-4 py-2 text-sm"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="btn-danger px-3 py-2 text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
