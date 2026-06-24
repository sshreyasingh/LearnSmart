import { useState } from 'react';

const SEVERITY_COLORS = {
  critical: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', badge: 'bg-red-600' },
  high: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', badge: 'bg-orange-500' },
  medium: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', badge: 'bg-yellow-500' },
  low: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', badge: 'bg-blue-400' },
};

function SeverityBar({ summary }) {
  const total = (summary.critical || 0) + (summary.high || 0) + (summary.medium || 0) + (summary.low || 0);
  if (total === 0) {
    return (
      <div className="flex items-center gap-2 text-green-700 bg-green-50 px-4 py-3 rounded-lg">
        <span className="text-xl">✅</span>
        <span className="font-medium">No security issues detected</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {summary.critical > 0 && (
        <span className="px-3 py-1.5 bg-red-600 text-white rounded-full text-sm font-bold">{summary.critical} Critical</span>
      )}
      {summary.high > 0 && (
        <span className="px-3 py-1.5 bg-orange-500 text-white rounded-full text-sm font-bold">{summary.high} High</span>
      )}
      {summary.medium > 0 && (
        <span className="px-3 py-1.5 bg-yellow-500 text-white rounded-full text-sm font-bold">{summary.medium} Medium</span>
      )}
      {summary.low > 0 && (
        <span className="px-3 py-1.5 bg-blue-400 text-white rounded-full text-sm font-bold">{summary.low} Low</span>
      )}
      <span className="text-sm text-gray-500">{total} total</span>
    </div>
  );
}

function VulnerabilityItem({ vuln }) {
  const colors = SEVERITY_COLORS[vuln.severity] || SEVERITY_COLORS.low;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-lg overflow-hidden ${colors.border}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors"
      >
        <span className={`${colors.badge} text-white text-xs font-bold px-2 py-0.5 rounded uppercase mt-0.5 shrink-0`}>
          {vuln.severity}
        </span>
        <div className="min-w-0 flex-1">
          <div className="font-medium text-gray-900 text-sm">{vuln.type.replace(/_/g, ' ')}</div>
          <div className="text-xs text-gray-500 mt-0.5">
            {vuln.file}:{vuln.line}
          </div>
        </div>
        <span className="text-gray-400 text-sm">{expanded ? '▴' : '▾'}</span>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-2">
          {vuln.snippet && (
            <div className="bg-gray-900 text-gray-300 rounded p-2 text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {vuln.snippet}
            </div>
          )}
          {vuln.recommendation && (
            <div className="text-xs text-gray-600 bg-gray-50 rounded p-2">
              <span className="font-semibold">Fix: </span>{vuln.recommendation}
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
    <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Security Report</h2>
      <SeverityBar summary={summary} />
      {vulnerabilities.length > 0 && (
        <div className="mt-4 space-y-2">
          {order.map(sev => {
            const items = grouped[sev];
            if (!items || items.length === 0) return null;
            return items.map((v, i) => <VulnerabilityItem key={`${sev}-${i}`} vuln={v} />);
          })}
        </div>
      )}
    </div>
  );
}
