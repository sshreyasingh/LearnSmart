import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../api/project.api';
import DifficultyAnalysisSection from '../components/dashboard/DifficultyAnalysisSection';

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}</p>
        </div>
        <Link
          to="/upload"
          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-lg shadow-primary-500/20 hover:shadow-xl hover:shadow-primary-500/30 transition-all"
        >
          Upload Project
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-12 text-center">
          <div className="text-6xl mb-4">📂</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No projects yet</h2>
          <p className="text-gray-500 mb-6">
            Upload source code to get AI-powered analysis.
          </p>
          <Link
            to="/upload"
            className="inline-block bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold shadow-lg shadow-primary-500/20 transition-all"
          >
            Upload Your First Project
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Overall Project Difficulty Analysis — shown at the top */}
          <DifficultyAnalysisSection projects={projects} />

          {/* Uploaded Projects */}
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4">Analyzed Projects</h2>
            <div className="grid gap-4">
              {projects.map((project) => (
                <div
                  key={project._id}
                  className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6 flex items-center justify-between group hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{project.projectName}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span>{project.fileCount} files</span>
                      <span>{project.totalLOC} LOC</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        project.status === 'completed' ? 'bg-green-100 text-green-700' :
                        project.status === 'failed' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    {project.detectedTechStack.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {project.detectedTechStack.map((tech) => (
                          <span key={tech} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded-md text-xs font-medium border border-primary-100">
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      to={`/projects/${project._id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium text-sm"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDelete(project._id)}
                      className="text-red-500 hover:text-red-600 text-sm"
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
