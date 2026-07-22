import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getProjects, deleteProject } from '../api/project.api';
import DifficultyAnalysisSection from '../components/dashboard/DifficultyAnalysisSection';
import { DashboardSkeleton } from '../components/common/Skeleton';
import { EmptyState } from '../components/common/Feedback';
import { ScrollReveal, StaggerChildren } from '../components/common/Animations';
import { useCountUp, useAnimatedValue } from '../hooks/useAnimatedValue';
import { useScrollReveal } from '../hooks/useScrollReveal';

function AnimatedStatCard({ label, value, icon, color = 'indigo' }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.3 });
  const display = useCountUp(value, { duration: 1200, easing: 'easeOutExpo', enabled: isVisible, delay: 100 });

  const colors = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    rose: 'from-rose-500 to-rose-600',
  };

  return (
    <div ref={ref} className="card-white p-5 flex items-center gap-4 hover:shadow-card-hover transition-all duration-400">
      <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${colors[color]} flex items-center justify-center text-white shadow-md shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-extrabold text-surface-900 tracking-tight tabular-nums">{display}</p>
        <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete }) {
  return (
    <div className="card-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 group">
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm group-hover:shadow-md group-hover:scale-105 transition-all duration-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-surface-900 truncate leading-snug">{project.projectName}</h3>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-surface-500 font-medium">
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                {project.fileCount} files
              </span>
              <span className="inline-flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {(project.totalLOC || 0).toLocaleString()} LOC
              </span>
              <span className={`badge ${
                project.status === 'completed' ? 'badge-success' :
                project.status === 'failed' ? 'badge-error' :
                project.status === 'processing' ? 'badge-warning' : 'badge-neutral'
              }`}>
                {project.status}
              </span>
            </div>
          </div>
        </div>
        {project.detectedTechStack?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 ml-[46px]">
            {project.detectedTechStack.map((tech) => (
              <span key={tech} className="px-2.5 py-1 bg-primary-50 text-primary-700 rounded-xl text-[11px] font-semibold border border-primary-100/60">
                {tech}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2.5 shrink-0 ml-[46px] sm:ml-0">
        <Link to={`/projects/${project._id}`} className="btn-primary px-4 py-2 text-sm">
          View analysis
        </Link>
        <button onClick={() => onDelete(project._id)} className="btn-ghost px-3 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600">
          Delete
        </button>
      </div>
    </div>
  );
}

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
    if (!confirm('Delete this project and all its analysis data?')) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch {
      setError('Failed to delete project');
    }
  };

  const stats = useMemo(() => {
    const completed = projects.filter((p) => p.status === 'completed');
    const totalFiles = completed.reduce((s, p) => s + (p.fileCount || 0), 0);
    const totalLoc = completed.reduce((s, p) => s + (p.totalLOC || 0), 0);
    const allTech = new Set();
    completed.forEach((p) => (p.detectedTechStack || []).forEach((t) => allTech.add(t)));
    return { total: projects.length, completed: completed.length, totalFiles, totalLoc, uniqueTech: allTech.size };
  }, [projects]);

  if (loading) return <DashboardSkeleton />;

  const hasProjects = projects.length > 0;

  return (
    <div className="page-container">
      <ScrollReveal animation="fadeUp" transition="smooth">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">Dashboard</h1>
            <p className="text-surface-500 mt-1">Welcome back, {user?.name}</p>
          </div>
          <Link to="/upload" className="btn-primary px-6 py-3 inline-flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload Project
          </Link>
        </div>
      </ScrollReveal>

      {error && (
        <div className="alert-error mb-6">
          <svg className="w-5 h-5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {!hasProjects ? (
        <div className="card-elevated">
          <EmptyState
            icon={
              <svg className="w-10 h-10 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            }
            title="No projects yet"
            description="Upload source code to get AI-powered analysis — architecture breakdowns, interactive diagrams, interview questions, and more."
            action={
              <Link to="/upload" className="btn-primary px-6 py-3 text-sm">
                Upload your first project
              </Link>
            }
          />
        </div>
      ) : (
        <div className="space-y-8">
          <StaggerChildren animation="fadeUp" baseDelay={40} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <AnimatedStatCard label="Projects" value={stats.total} color="indigo" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>} />
            <AnimatedStatCard label="Total Files" value={stats.totalFiles} color="emerald" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
            <AnimatedStatCard label="Total LOC" value={stats.totalLoc} color="amber" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>} />
            <AnimatedStatCard label="Technologies" value={stats.uniqueTech} color="rose" icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>} />
          </StaggerChildren>

          <ScrollReveal animation="fadeUp" transition="smooth">
            <DifficultyAnalysisSection projects={projects} />
          </ScrollReveal>

          <div>
            <ScrollReveal animation="fadeUp" transition="fast">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-extrabold text-surface-900">Analyzed Projects</h2>
                <span className="text-xs text-surface-400 font-medium">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
              </div>
            </ScrollReveal>
            <StaggerChildren animation="fadeUp" baseDelay={60} className="grid gap-4">
              {projects.map((project) => (
                <ProjectCard key={project._id} project={project} onDelete={handleDelete} />
              ))}
            </StaggerChildren>
          </div>
        </div>
      )}
    </div>
  );
}
