import { useState, useEffect } from 'react';
import { getDifficultyAnalysis } from '../../api/staticAnalysis.api';

const LEVEL_STYLES = {
  Beginner: { bg: 'bg-emerald-50 border-emerald-200', badge: 'badge-success', bar: 'bg-emerald-500', icon: '🟢' },
  Intermediate: { bg: 'bg-blue-50 border-blue-200', badge: 'badge-info', bar: 'bg-blue-500', icon: '🔵' },
  Advanced: { bg: 'bg-amber-50 border-amber-200', badge: 'badge-warning', bar: 'bg-amber-500', icon: '🟠' },
  Expert: { bg: 'bg-red-50 border-red-200', badge: 'badge-error', bar: 'bg-red-500', icon: '🔴' },
};

function ScoreBar({ label, value, max = 10, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-surface-500 w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-surface-100 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color || '#6366f1' }}
        />
      </div>
      <span className="text-xs font-bold text-surface-600 w-7 text-right tabular-nums">{value.toFixed(1)}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="px-6 py-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-surface-200 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-surface-200 rounded w-48 mb-2" />
          <div className="h-3 bg-surface-200 rounded w-64" />
        </div>
      </div>
    </div>
  );
}

export default function DifficultyAnalysisSection({ projects }) {
  const [difficulties, setDifficulties] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      if (!projects || projects.length === 0) { setLoading(false); return; }
      const results = {};
      await Promise.allSettled(
        projects.map(async (p) => {
          try {
            const res = await getDifficultyAnalysis(p._id);
            if (res.data?.data?.difficulty) results[p._id] = res.data.data.difficulty;
          } catch { /* silently skip unavailable difficulty data */ }
        })
      );
      setDifficulties(results);
      setLoading(false);
    };
    fetchAll();
  }, [projects]);

  const hasDifficultyData = Object.keys(difficulties).length > 0;
  const allDifficulties = Object.values(difficulties);

  const avgScore = allDifficulties.length > 0
    ? (allDifficulties.reduce((s, d) => s + d.score, 0) / allDifficulties.length).toFixed(1)
    : 0;
  const totalLearningHours = allDifficulties.reduce((s, d) => s + (d.estimatedLearningTime?.hours || 0), 0);
  const avgLearningHours = allDifficulties.length > 0 ? Math.round(totalLearningHours / allDifficulties.length) : 0;

  const levelCounts = {};
  for (const proj of Object.entries(difficulties)) {
    const level = proj[1].level;
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  }

  if (loading) {
    return (
      <div className="card-white overflow-hidden">
        <div className="px-6 py-5 border-b border-surface-100">
          <div className="h-6 bg-surface-200 rounded w-56 animate-pulse" />
        </div>
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (!hasDifficultyData) return null;

  return (
    <div className="card-white overflow-hidden animate-fade-in">
      <div className="px-6 py-5 border-b border-surface-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-surface-900">Project Difficulty Analysis</h2>
            <p className="text-sm text-surface-500 mt-0.5">
              ML-powered assessment of codebase complexity, learning time, and skill requirements
            </p>
          </div>
          <span className="text-xs text-surface-400 bg-surface-50 px-3 py-1.5 rounded-full font-semibold border border-surface-200">
            XGBoost Regressor
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-100">
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">Avg Difficulty</p>
          <p className="text-2xl font-extrabold text-surface-900 mt-1">
            {avgScore} <span className="text-sm font-normal text-surface-400">/ 10</span>
          </p>
        </div>
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">Avg Learning Time</p>
          <p className="text-2xl font-extrabold text-surface-900 mt-1">
            {avgLearningHours} <span className="text-sm font-normal text-surface-400">hours</span>
          </p>
        </div>
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">Projects</p>
          <p className="text-2xl font-extrabold text-surface-900 mt-1">{Object.keys(difficulties).length}</p>
        </div>
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-surface-500 font-semibold uppercase tracking-wider">Levels</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {Object.entries(LEVEL_STYLES).map(([level, style]) => {
              const count = levelCounts[level] || 0;
              if (count === 0) return null;
              return (
                <span key={level} className={`text-xs px-2 py-0.5 rounded-full font-semibold ${style.badge}`}>
                  {count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      <div className="divide-y divide-surface-100">
        {projects.filter(p => difficulties[p._id]).map(project => {
          const diff = difficulties[project._id];
          if (!diff) return null;
          const style = LEVEL_STYLES[diff.level] || LEVEL_STYLES.Beginner;
          const isExpanded = expanded === project._id;

          return (
            <div key={project._id} className={`px-6 py-5 ${style.bg} transition-colors`}>
              <button
                onClick={() => setExpanded(isExpanded ? null : project._id)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span className="text-2xl shrink-0">{style.icon}</span>
                  <div className="min-w-0">
                    <h3 className="font-bold text-surface-900 truncate">{project.projectName}</h3>
                    <p className="text-xs text-surface-500 mt-0.5 truncate">
                      {project.fileCount} files · {project.totalLOC} LOC · {project.detectedTechStack?.slice(0, 3).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-surface-900">{diff.score}</span>
                    <span className="text-xs text-surface-400">/10</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${style.badge}`}>
                    {diff.level}
                  </span>
                  <svg
                    className={`w-5 h-5 text-surface-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-5 pt-5 border-t border-surface-200/50 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                  <div className="md:col-span-2 space-y-3">
                    <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-3">Complexity Dimensions</p>
                    {diff.dimensions && (
                      <>
                        <ScoreBar label="Size" value={diff.dimensions.size} color="#3b82f6" />
                        <ScoreBar label="Complexity" value={diff.dimensions.complexity} color="#f59e0b" />
                        <ScoreBar label="Architecture" value={diff.dimensions.architecture} color="#ef4444" />
                        <ScoreBar label="Surface Area" value={diff.dimensions.surface} color="#8b5cf6" />
                        <ScoreBar label="Quality" value={diff.dimensions.quality} color="#22c55e" />
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="bg-white/70 rounded-xl p-4 border border-surface-100">
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Learning Time</p>
                      <p className="text-xl font-extrabold text-surface-900">
                        {diff.estimatedLearningTime?.hours || '—'} <span className="text-sm font-normal text-surface-500">hours</span>
                      </p>
                      <p className="text-xs text-surface-400">{diff.estimatedLearningTime?.range}</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 border border-surface-100">
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Skill Level</p>
                      <p className="text-xl font-extrabold text-surface-900">{diff.recommendedSkillLevel?.level || '—'}</p>
                      <p className="text-xs text-surface-400">{diff.recommendedSkillLevel?.years}</p>
                    </div>
                    <div className="bg-white/70 rounded-xl p-4 border border-surface-100">
                      <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-1">Confidence</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 bg-surface-100 rounded-full h-2.5 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-500 transition-all duration-700" style={{ width: `${(diff.confidence || 0) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-surface-600">{Math.round((diff.confidence || 0) * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
