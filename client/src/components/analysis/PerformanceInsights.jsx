import { useState } from 'react';

const SEVERITY_STYLES = {
  high: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200' },
  low: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
};

function IssueItem({ issue }) {
  const styles = SEVERITY_STYLES[issue.severity] || SEVERITY_STYLES.low;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`${styles.border} border rounded-lg overflow-hidden`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
      >
        <span className={`${styles.bg} ${styles.text} text-xs font-bold px-2 py-0.5 rounded uppercase mt-0.5 shrink-0`}>
          {issue.severity}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 text-sm">{issue.description}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {issue.type.replace(/_/g, ' ')} — {issue.file}:{issue.line}
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0">
          {issue.suggestion && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-100">
              <span className="font-semibold">Fix: </span>{issue.suggestion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PerformanceInsights({ performance }) {
  if (!performance) return null;

  const { issues = [] } = performance;

  const counts = { high: 0, medium: 0, low: 0 };
  for (const i of issues) counts[i.severity] = (counts[i.severity] || 0) + 1;

  const grouped = {};
  for (const i of issues) {
    if (!grouped[i.severity]) grouped[i.severity] = [];
    grouped[i.severity].push(i);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Performance Insights</h2>

      {issues.length === 0 ? (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
          <span className="text-xl">✅</span>
          <span className="font-medium">No performance issues detected</span>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 flex-wrap mb-4">
            {counts.high > 0 && <span className="px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">{counts.high} High</span>}
            {counts.medium > 0 && <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">{counts.medium} Medium</span>}
            {counts.low > 0 && <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">{counts.low} Low</span>}
            <span className="text-xs text-gray-500">{issues.length} total</span>
          </div>

          <div className="space-y-2">
            {['high', 'medium', 'low'].map(sev => {
              const items = grouped[sev];
              if (!items || items.length === 0) return null;
              return items.map((issue, i) => <IssueItem key={`${sev}-${i}`} issue={issue} />);
            })}
          </div>
        </>
      )}
    </div>
  );
}
