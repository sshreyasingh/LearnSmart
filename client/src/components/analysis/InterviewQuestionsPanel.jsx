import { useState, useEffect, useCallback } from 'react';
import { getInterviewQuestions, regenerateInterviewQuestions } from '../../api/interview.api';

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-100 text-green-700',
  intermediate: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
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
  const catColor = CATEGORY_COLORS[question.category] || 'border-l-gray-400';
  const diffColor = DIFFICULTY_COLORS[question.difficulty] || 'bg-gray-100 text-gray-600';

  return (
    <div className={`bg-white border border-gray-200 rounded-lg border-l-4 ${catColor} overflow-hidden transition-shadow hover:shadow-sm`}>
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-start gap-3"
      >
        <span className={`text-lg mt-0.5 shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${diffColor}`}>
              {question.difficulty}
            </span>
            <span className="text-[10px] text-gray-400 uppercase font-medium">
              {CATEGORY_LABELS[question.category] || question.category}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-800 leading-snug">{question.question}</p>
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pl-11">
          <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Suggested Answer</p>
            <p className="text-sm text-gray-700 leading-relaxed">{question.suggestedAnswer}</p>
          </div>
          {question.keyConcepts?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {question.keyConcepts.map((c, i) => (
                <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                  {c}
                </span>
              ))}
            </div>
          )}
          {question.relatedFiles?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {question.relatedFiles.map((f, i) => (
                <span key={i} className="text-[10px] font-mono text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                  {f}
                </span>
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
      <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Interview Questions</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white/60 rounded-lg h-20" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Interview Questions</h2>
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 overflow-hidden">
      <div className="px-6 pt-6 pb-3 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Interview Questions</h2>
          <p className="text-sm text-gray-500">Practice questions based on the source code</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            <span className={`inline-block ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {categories.length > 0 && (
        <div className="px-6 pb-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => { setFilter('all'); setShowAll(false); }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === cat
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {CATEGORY_LABELS[cat] || cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="px-6 pb-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No questions in this category.</p>
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
            className="mt-3 w-full py-2 text-sm font-medium text-gray-500 bg-white/50 rounded-lg hover:bg-white hover:text-gray-700 transition-colors border border-gray-200/50"
          >
            {showAll
              ? `Show less (${INITIAL_SHOW})`
              : `Show all ${filtered.length} questions`}
          </button>
        )}
      </div>
    </div>
  );
}
