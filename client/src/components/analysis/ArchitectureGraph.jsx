import { useMemo } from 'react';
import MermaidDiagram from '../visualization/MermaidDiagram';
import { buildArchitectureMermaid } from '../../utils/mermaidBuilders';

const LAYER_DESCRIPTIONS = {
  entry: 'Entry point files (index, main, app)',
  page: 'Page-level components & views',
  component: 'Reusable UI components',
  hook: 'Custom React hooks',
  context: 'React context providers',
  service: 'Business logic & API services',
  middleware: 'Express middleware / interceptors',
  controller: 'Route handlers & controllers',
  route: 'Route definitions & API endpoints',
  model: 'Database models & schemas',
  schema: 'Validation schemas & types',
  util: 'Utility / helper functions',
  config: 'Configuration files',
  test: 'Test files & test suites',
  other: 'Other files',
};

const LAYER_COLORS = {
  entry: '#a855f7',
  page: '#3b82f6',
  component: '#6366f1',
  hook: '#06b6d4',
  context: '#14b8a6',
  service: '#22c55e',
  controller: '#eab308',
  route: '#f97316',
  middleware: '#84cc16',
  model: '#ef4444',
  schema: '#ec4899',
  util: '#6b7280',
  config: '#78716c',
  test: '#10b981',
  other: '#9ca3af',
};

export function ArchitectureGraph({ dependencyGraph, simplifiedGraph }) {
  const graph = simplifiedGraph || dependencyGraph;

  const mermaidCode = useMemo(() => buildArchitectureMermaid(graph), [graph]);

  const layers = graph?.nodes || graph?.groups || [];
  const edges = graph?.edges || [];
  const metadata = graph?.metadata || {};

  if (!graph) {
    return (
      <div className="section-card">
        <h2 className="text-xl font-bold text-surface-900 mb-4">Architecture</h2>
        <p className="text-surface-500 text-sm">No dependency graph available for this project.</p>
      </div>
    );
  }

  return (
    <div className="section-card">
      <h2 className="text-xl font-bold text-surface-900 mb-1">Project Structure</h2>
      <p className="text-sm text-surface-500 mb-5">
        Files grouped by architectural layer with inter-layer dependency flows.
      </p>

      <div className="bg-white/60 border border-emerald-200 rounded-xl p-4 mb-5">
        <h4 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">Layer Legend</h4>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(LAYER_COLORS).slice(0, 12).map(([id, color]) => (
            <span
              key={id}
              className="text-[10px] px-2.5 py-1 rounded-md font-semibold text-white shadow-sm"
              style={{ backgroundColor: color }}
              title={LAYER_DESCRIPTIONS[id]}
            >
              {id}
            </span>
          ))}
        </div>
      </div>

      {metadata.totalNodes && (
        <div className="flex items-center gap-4 mb-5 text-xs text-surface-500 font-medium">
          <span>{metadata.totalNodes} layers</span>
          <span>{edges?.length || 0} dependencies</span>
          {metadata.disconnectedCount > 0 && (
            <span>{metadata.disconnectedCount} isolated</span>
          )}
        </div>
      )}

      <div className="bg-white/40 border border-emerald-200 rounded-xl overflow-x-auto mb-6">
        <MermaidDiagram
          code={mermaidCode}
          id="arch-diagram"
          emptyMessage="No architecture data to render."
          loadingMessage="Rendering architecture diagram..."
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {[...layers]
          .sort((a, b) => (b.totalLOC || b.fileCount || 0) - (a.totalLOC || a.fileCount || 0))
          .map((layer) => {
            const color = LAYER_COLORS[layer.id] || '#9ca3af';
            return (
              <div
                key={layer.id}
                className="bg-white/80 border rounded-xl p-4 hover:shadow-soft transition-shadow"
                style={{ borderColor: color }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color }}
                >
                  {layer.label || layer.id}
                </div>
                <div className="text-xs text-surface-500 space-y-0.5">
                  <div>{layer.fileCount} files</div>
                  {layer.totalLOC > 0 && <div>{layer.totalLOC.toLocaleString()} LOC</div>}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
