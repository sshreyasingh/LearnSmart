const diagramList = [
  { key: 'dependencyGraph', label: 'Dependency Graph', icon: '🔗', library: 'd3' },
  { key: 'moduleGraph', label: 'Module Relations', icon: '🔀', library: 'd3' },
  { key: 'callGraph', label: 'Call Graph', icon: '📞', library: 'd3' },
  { key: 'apiFlow', label: 'API Flow', icon: '🌐', library: 'mermaid' },
  { key: 'databaseER', label: 'Database ER', icon: '🗄️', library: 'mermaid' },
  { key: 'executionFlow', label: 'Execution Flow', icon: '⚡', library: 'mermaid' },
  { key: 'sequenceDiagram', label: 'Sequence', icon: '🔄', library: 'mermaid' },
];

export default function DiagramControls({ activeDiagram, onDiagramChange, diagrams }) {
  const availableDiagrams = diagramList.filter((d) => {
    if (!diagrams) return true;
    if (d.key === 'dependencyGraph') return !!diagrams.dependencyGraph;
    if (d.key === 'apiFlow') return !!diagrams.apiFlow;
    if (d.key === 'databaseER') return !!diagrams.databaseER;
    if (d.key === 'executionFlow') return !!diagrams.executionFlow;
    return true;
  });

  const d3Diagrams = availableDiagrams.filter((d) => d.library === 'd3');
  const mermaidDiagrams = availableDiagrams.filter((d) => d.library === 'mermaid');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">D3 Interactive</span>
        <div className="flex flex-wrap items-center gap-2">
          {d3Diagrams.map((d) => (
            <button
              key={d.key}
              onClick={() => onDiagramChange(d.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeDiagram === d.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mermaid Diagrams</span>
        <div className="flex flex-wrap items-center gap-2">
          {mermaidDiagrams.map((d) => (
            <button
              key={d.key}
              onClick={() => onDiagramChange(d.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                activeDiagram === d.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{d.icon}</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>
      </div>
      {availableDiagrams.length === 0 && (
        <span className="text-xs text-gray-400">No diagram data available</span>
      )}
    </div>
  );
}
