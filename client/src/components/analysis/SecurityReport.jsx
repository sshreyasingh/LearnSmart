import { useState } from 'react';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', badge: 'bg-red-600' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', badge: 'bg-orange-500' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300', badge: 'bg-amber-500' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', badge: 'bg-blue-400' },
};

function SeverityBar({ summary }) {
  const total = (summary.critical || 0) + (summary.high || 0) + (summary.medium || 0) + (summary.low || 0);
  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl border border-emerald-200">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="font-medium">No security issues detected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {summary.critical > 0 && <span className="badge-error">{summary.critical} Critical</span>}
      {summary.high > 0 && <span className="px-3 py-1.5 bg-orange-500 text-white rounded-full text-sm font-bold">{summary.high} High</span>}
      {summary.medium > 0 && <span className="px-3 py-1.5 bg-amber-500 text-white rounded-full text-sm font-bold">{summary.medium} Medium</span>}
      {summary.low > 0 && <span className="px-3 py-1.5 bg-blue-400 text-white rounded-full text-sm font-bold">{summary.low} Low</span>}
      <span className="text-sm text-surface-500 font-medium">{total} total</span>
    </div>
  );
}

function VulnerabilityItem({ vuln }) {
  const colors = SEVERITY_COLORS[vuln.severity] || SEVERITY_COLORS.low;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden ${colors.border} shadow-sm`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3.5 flex items-start gap-3 hover:bg-white/50 transition-colors"
      >
        <span className={`${colors.badge} text-white text-xs font-bold px-2.5 py-1 rounded-lg uppercase mt-0.5 shrink-0`}>
          {vuln.severity}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-surface-900 text-sm capitalize">{vuln.type.replace(/_/g, ' ')}</div>
          <div className="text-xs text-surface-500 mt-1 font-mono">
            {vuln.file}:{vuln.line}
          </div>
        </div>
        <svg className={`w-5 h-5 text-surface-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 animate-fade-in">
          {vuln.snippet && (
            <div className="bg-surface-900 text-surface-300 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {vuln.snippet}
            </div>
          )}
          {vuln.recommendation && (
            <div className="text-xs text-surface-600 bg-surface-50 rounded-lg p-3 border border-surface-200">
              <span className="font-semibold text-surface-800">Fix: </span>{vuln.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SecurityReport({ security }) {
  if (!security) return null;

  const { vulnerabilities = [], summary = {} } = security;
  const grouped = {};
  for (const v of vulnerabilities) {
    if (!grouped[v.severity]) grouped[v.severity] = [];
    grouped[v.severity].push(v);
  }
  const order = ['critical', 'high', 'medium', 'low'];

  return (
    <div className="section-card">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-xl font-bold text-surface-900">Security Report</h2>
      </div>
      <SeverityBar summary={summary} />
      {vulnerabilities.length > 0 && (
        <div className="mt-5 space-y-2.5">
          {order.map(sev => {
            const items = grouped[sev];
            if (!items?.length) return null;
            return items.map((v, i) => <VulnerabilityItem key={`${sev}-${i}`} vuln={v} />);
          })}
        </div>
      )}
    </div>
  );
}
