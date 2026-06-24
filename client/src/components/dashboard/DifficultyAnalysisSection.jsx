import { useState, useEffect } from 'react';
import { getDifficultyAnalysis } from '../../api/staticAnalysis.api';

const LEVEL_STYLES = {
  Beginner: { bg: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700', bar: 'bg-green-500', icon: '🟢' },
  Intermediate: { bg: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500', icon: '🔵' },
  Advanced: { bg: 'bg-amber-50 border-amber-200', badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', icon: '🟠' },
  Expert: { bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', bar: 'bg-red-500', icon: '🔴' },
};

function ScoreBar({ label, value, max = 10, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color || '#3b82f6' }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-6 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export default function DifficultyAnalysisSection({ projects }) {
  const [difficulties, setDifficulties] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      if (!projects || projects.length === 0) {
        setLoading(false);
        return;
      }
      const results = {};
      await Promise.allSettled(
        projects.map(async (p) => {
          try {
            const res = await getDifficultyAnalysis(p._id);
            if (res.data?.data?.difficulty) {
              results[p._id] = res.data.data.difficulty;
            }
          } catch {
            // silently fail — difficulty data not available for this project
          }
        })
      );
      setDifficulties(results);
      setLoading(false);
    };
    fetchAll();
  }, [projects]);

  const completedProjects = (projects || []).filter(p => p.status === 'completed');
  const hasDifficultyData = Object.keys(difficulties).length > 0;

  // Calculate aggregate stats
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Project Difficulty Analysis</h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-8 bg-gray-200 rounded" />
          <div className="h-8 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (!hasDifficultyData) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Project Difficulty Analysis</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              ML-powered assessment of codebase complexity, learning time, and skill requirements
            </p>
          </div>
          <span className="text-xs text-gray-400 bg-gray-50 px-3 py-1.5 rounded-full font-medium">
            XGBoost Regressor
          </span>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-gray-100">
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Avg Difficulty</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{avgScore} <span className="text-sm font-normal text-gray-400">/ 10</span></p>
        </div>
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Avg Learning Time</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{avgLearningHours} <span className="text-sm font-normal text-gray-400">hours</span></p>
        </div>
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Projects Analyzed</p>
          <p className="text-2xl font-extrabold text-gray-900 mt-1">{Object.keys(difficulties).length}</p>
        </div>
        <div className="bg-white px-6 py-4">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Level Distribution</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            {Object.entries(LEVEL_STYLES).map(([level, style]) => {
              const count = levelCounts[level] || 0;
              if (count === 0) return null;
              return (
                <span key={level} className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
                  {count}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* Per-project list */}
      <div className="divide-y divide-gray-100">
        {projects.filter(p => difficulties[p._id]).map(project => {
          const diff = difficulties[project._id];
          if (!diff) return null;
          const style = LEVEL_STYLES[diff.level] || LEVEL_STYLES.Beginner;
          const isExpanded = expanded === project._id;

          return (
            <div key={project._id} className={`px-6 py-4 ${style.bg} transition-colors`}>
              <button
                onClick={() => setExpanded(isExpanded ? null : project._id)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{style.icon}</span>
                  <div>
                    <h3 className="font-bold text-gray-900">{project.projectName}</h3>
                    <p className="text-xs text-gray-500">
                      {project.fileCount} files · {project.totalLOC} LOC · {project.detectedTechStack?.slice(0, 3).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-gray-900">{diff.score}</span>
                    <span className="text-xs text-gray-400">/10</span>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${style.badge}`}>
                    {diff.level}
                  </span>
                  <svg className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-200/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left: Dimension bars */}
                  <div className="md:col-span-2 space-y-2.5">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Complexity Dimensions</p>
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

                  {/* Right: Learning time & skill level */}
                  <div className="space-y-3">
                    <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Estimated Learning Time</p>
                      <p className="text-lg font-extrabold text-gray-900">
                        {diff.estimatedLearningTime?.hours || '—'} <span className="text-sm font-normal text-gray-500">hours</span>
                      </p>
                      <p className="text-xs text-gray-400">{diff.estimatedLearningTime?.range}</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Required Skill Level</p>
                      <p className="text-lg font-extrabold text-gray-900">{diff.recommendedSkillLevel?.level || '—'}</p>
                      <p className="text-xs text-gray-400">{diff.recommendedSkillLevel?.years}</p>
                    </div>
                    <div className="bg-white/60 rounded-xl p-3 border border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Model Confidence</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-primary-500" style={{ width: `${(diff.confidence || 0) * 100}%` }} />
                        </div>
                        <span className="text-xs font-bold text-gray-600">{Math.round((diff.confidence || 0) * 100)}%</span>
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
