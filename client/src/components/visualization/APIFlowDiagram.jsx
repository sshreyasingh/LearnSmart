import { useMemo } from 'react';
import MermaidDiagram from './MermaidDiagram';
import { buildAPIFlowMermaid } from '../../utils/mermaidBuilders';

const METHOD_COLORS = {
  GET: '#22c55e',
  POST: '#3b82f6',
  PUT: '#f59e0b',
  PATCH: '#f97316',
  DELETE: '#ef4444',
  ALL: '#8b5cf6',
};

export default function APIFlowDiagram({ apiFlow }) {
  const mermaidCode = useMemo(() => buildAPIFlowMermaid(apiFlow), [apiFlow]);

  const { routes, flowSteps, phases } = apiFlow || { routes: [], flowSteps: [], phases: [] };

  if (!routes || routes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No API endpoints detected.
      </div>
    );
  }

  const grouped = {};
  for (const route of routes) {
    const prefix = '/' + (route.path?.split('/').filter(Boolean)[0] || '');
    if (!grouped[prefix]) grouped[prefix] = [];
    grouped[prefix].push(route);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">API Flow Diagram</h3>
          <p className="text-xs text-gray-400">{routes.length} endpoints</p>
        </div>
      </div>

      {/* Mermaid Sequence Diagram */}
      <div className="bg-white/40 border border-emerald-200 rounded-lg overflow-x-auto">
        <MermaidDiagram
          code={mermaidCode}
          id="api-flow-diagram"
          emptyMessage="No API flow to render."
          loadingMessage="Rendering API flow diagram..."
        />
      </div>

      {/* API Endpoints */}
      <div className="space-y-4">
        {Object.entries(grouped)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([prefix, prefixRoutes]) => (
            <div key={prefix}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{prefix}</p>
              <div className="space-y-1">
                {prefixRoutes
                  .sort((a, b) => a.path.localeCompare(b.path))
                  .map((route, i) => {
                    const color = METHOD_COLORS[route.method] || '#8b5cf6';
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white border border-gray-100 hover:border-gray-200 transition-colors"
                      >
                        <span
                          className="px-2 py-0.5 rounded text-xs font-mono font-bold text-white min-w-[60px] text-center"
                          style={{ backgroundColor: color }}
                        >
                          {route.method}
                        </span>
                        <span className="font-mono text-sm text-gray-700">{route.path}</span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {route.file?.split('/').pop()}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
      </div>

      {/* Request Flow Steps */}
      {flowSteps && flowSteps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Request Lifecycle
          </p>
          <div className="relative">
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-gray-200" />
            <div className="space-y-0">
              {flowSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-4 relative">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 relative z-10"
                    style={{ backgroundColor: step.color || '#94a3b8' }}
                  >
                    {step.step || i + 1}
                  </div>
                  <div className="py-1.5 min-w-0">
                    <p className="text-sm font-medium text-gray-700">{step.description}</p>
                    <p className="text-xs text-gray-400 truncate">{step.file?.split('/').pop()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Phase Summary */}
      {phases && phases.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {phases.map((phase, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: phase.color || '#94a3b8' }}
            >
              {phase.label}: {phase.stepCount} steps
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
