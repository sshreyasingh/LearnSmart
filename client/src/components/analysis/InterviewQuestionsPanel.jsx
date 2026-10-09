import { useState, useEffect, useCallback } from 'react';
import { getInterviewQuestions, regenerateInterviewQuestions } from '../../api/interview.api';

const DIFFICULTY_COLORS = {
  beginner: 'badge-success',
  intermediate: 'badge-info',
  advanced: 'badge-warning',
};

const CATEGORY_COLORS = {
  architecture: 'border-l-indigo-500',
  'code-deep-dive': 'border-l-emerald-500',
  'design-pattern': 'border-l-amber-500',
  'tech-stack': 'border-l-cyan-500',
  'problem-solving': 'border-l-rose-500',
  behavioral: 'border-l-sky-500',
};

const CATEGORY_LABELS = {
  architecture: 'Architecture',
  'code-deep-dive': 'Code Deep Dive',
  'design-pattern': 'Design Patterns',
  'tech-stack': 'Tech Stack',
  'problem-solving': 'Problem Solving',
  behavioral: 'Behavioral',
};

function QuestionCard({ question, expanded, onToggle }) {
  const catColor = CATEGORY_COLORS[question.category] || 'border-l-surface-400';
  const diffColor = DIFFICULTY_COLORS[question.difficulty] || 'badge-info';

  return (
    <div className={`bg-surface-100 border border-surface-200 rounded-xl border-l-4 ${catColor} overflow-hidden shadow-sm hover:shadow-soft transition-shadow`}>
      <button onClick={onToggle} className="w-full text-left px-4 py-3.5 flex items-start gap-3">
        <svg className={`w-5 h-5 text-surface-400 shrink-0 mt-0.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`${diffColor} px-2 py-0.5 text-[10px] font-bold uppercase`}>
              {question.difficulty}
            </span>
            <span className="text-[10px] text-surface-400 uppercase font-semibold tracking-wide">
              {CATEGORY_LABELS[question.category] || question.category}
            </span>
          </div>
          <p className="text-sm font-semibold text-surface-800 leading-snug">{question.question}</p>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-12 animate-fade-in">
          <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
            <p className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2">Suggested Answer</p>
            <p className="text-sm text-surface-700 leading-relaxed">{question.suggestedAnswer}</p>
          </div>
          {question.keyConcepts?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {question.keyConcepts.map((c, i) => (
                <span key={i} className="px-2 py-0.5 bg-surface-100 text-surface-600 rounded-lg text-xs font-medium">{c}</span>
              ))}
            </div>
          )}
          {question.relatedFiles?.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {question.relatedFiles.map((f, i) => (
                <span key={i} className="text-[10px] font-mono text-surface-400 bg-surface-50 px-2 py-0.5 rounded-md border border-surface-200">{f}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function InterviewQuestionsPanel({ projectId }) {
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  const INITIAL_SHOW = 4;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    getInterviewQuestions(projectId)
      .then((res) => {
        if (!cancelled) {
          setQuestions(res.data.data.questions || []);
          setStats(res.data.data.stats || null);
        }
      })
      .catch(() => setError('Failed to load interview questions'))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError('');
    try {
      const res = await regenerateInterviewQuestions(projectId);
      setQuestions(res.data.data.questions || []);
      setStats(res.data.data.stats || null);
      setExpandedId(null);
      setFilter('all');
      setShowAll(false);
    } catch {
      setError('Failed to regenerate interview questions');
    } finally {
      setRefreshing(false);
    }
  }, [projectId]);

  const filtered = filter === 'all'
    ? questions
    : questions.filter((q) => q.category === filter);

  const categories = [...new Set(questions.map((q) => q.category))];

  if (loading) {
    return (
      <div className="section-card">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Interview Questions</h2>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-surface-100/60 rounded-xl h-20" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="section-card overflow-hidden">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-1">
        <div>
          <h2 className="text-xl font-bold text-surface-900">Interview Questions</h2>
          <p className="text-sm text-surface-500">Practice questions based on the source code</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-ghost px-3 py-1.5 text-xs"
        >
          <span className={`inline-block mr-1 ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-900/15 text-red-400 px-3 py-2 rounded-xl text-xs mt-2 mb-2">
          {error}
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-4 mb-4">
          <button
            onClick={() => { setFilter('all'); setShowAll(false); }}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              filter === 'all' ? 'bg-surface-800 text-white shadow-soft' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
            }`}
          >
            All ({questions.length})
          </button>
          {categories.map((cat) => {
            const count = questions.filter((q) => q.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => { setFilter(cat); setShowAll(false); }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filter === cat ? 'bg-surface-800 text-white shadow-soft' : 'bg-surface-100 text-surface-600 hover:bg-surface-200'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div>
        {filtered.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-8">No questions in this category.</p>
        ) : (
          <div className="space-y-3">
            {(showAll ? filtered : filtered.slice(0, INITIAL_SHOW)).map((q) => (
              <QuestionCard
                key={q._id || q.id}
                question={q}
                expanded={expandedId === (q._id || q.id)}
                onToggle={() => setExpandedId(expandedId === (q._id || q.id) ? null : (q._id || q.id))}
              />
            ))}
          </div>
        )}
        {filtered.length > INITIAL_SHOW && (
          <button
            onClick={() => { setShowAll(!showAll); setExpandedId(null); }}
            className="mt-4 w-full py-3 text-sm font-semibold text-surface-500 bg-surface-100/50 rounded-xl hover:bg-surface-100 hover:text-surface-700 transition-colors border border-surface-200/50"
          >
            {showAll ? `Show less (${INITIAL_SHOW})` : `Show all ${filtered.length} questions`}
          </button>
        )}
      </div>
    </div>
  );
}
