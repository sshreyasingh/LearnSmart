function StatCard({ icon, label, value, sub, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
  };
  const bg = colorMap[color] || colorMap.primary;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
      {icon && <div className="text-lg mb-1">{icon}</div>}
      <div className={`text-2xl font-bold ${bg.replace('bg-', 'text-').replace('-50', '-600')}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

export function MetricsPanel({ metrics }) {
  if (!metrics) return null;

  const cc = metrics.cyclomaticComplexity || {};
  const ccColor = (cc.average || 0) <= 10 ? 'green' : (cc.average || 0) <= 20 ? 'yellow' : 'red';
  const mi = metrics.maintainabilityIndex ?? 100;
  const miColor = mi >= 80 ? 'green' : mi >= 50 ? 'yellow' : 'red';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Code Metrics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        <StatCard icon="📁" label="Folders" value={metrics.folderCount || 0} />
        <StatCard icon="🔌" label="Routes" value={metrics.routeCount || 0} />
        <StatCard icon="🧩" label="Components" value={metrics.componentCount || 0} />
        <StatCard icon="💬" label="Comment %" value={`${metrics.commentPercent || 0}%`} sub={metrics.commentPercent >= 20 ? 'Well-documented' : metrics.commentPercent >= 10 ? 'Adequate' : 'Sparse'} color={metrics.commentPercent >= 20 ? 'green' : metrics.commentPercent >= 10 ? 'yellow' : 'red'} />
        <StatCard icon="🔄" label="Cyclomatic (avg)" value={(cc.average || 0).toFixed(1)} sub={`max: ${cc.max || 0}`} color={ccColor} />
        <StatCard icon="📊" label="Maintainability" value={mi} sub={mi >= 80 ? 'Good' : mi >= 50 ? 'Fair' : 'Low'} color={miColor} />
      </div>
    </div>
  );
}
