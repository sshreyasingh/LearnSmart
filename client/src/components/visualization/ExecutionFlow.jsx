import { useMemo, useState } from 'react';
import MermaidDiagram from './MermaidDiagram';
import { buildExecutionFlowMermaid } from '../../utils/mermaidBuilders';

export default function ExecutionFlow({ executionFlow }) {
  const [activePhase, setActivePhase] = useState(null);

  const mermaidCode = useMemo(
    () => buildExecutionFlowMermaid(executionFlow),
    [executionFlow]
  );

  const { steps, phases, entryPoint, totalSteps } = executionFlow || { steps: [], phases: [], entryPoint: null, totalSteps: 0 };

  if (!steps || steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No execution flow data available.
      </div>
    );
  }

  const filteredSteps = activePhase
    ? steps.filter((s) => s.phase === activePhase)
    : steps;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Execution Flow</h3>
          <p className="text-xs text-gray-400">
            {totalSteps || steps.length} steps &middot; {phases?.length || 0} phases
          </p>
        </div>
        {entryPoint && (
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full">
            Entry: {entryPoint.split('/').pop()}
          </span>
        )}
      </div>

      {/* Phase filter chips */}
      {phases && phases.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActivePhase(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !activePhase ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({steps.length})
          </button>
          {phases.map((phase, i) => {
            const count = steps.filter((s) => s.phase === phase.phase).length;
            if (count === 0) return null;
            return (
              <button
                key={i}
                onClick={() => setActivePhase(phase.phase)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors`}
                style={{
                  backgroundColor: activePhase === phase.phase ? phase.color : `${phase.color}20`,
                  color: activePhase === phase.phase ? '#fff' : phase.color,
                }}
              >
                {phase.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Mermaid Flowchart */}
      <div className="bg-white/40 border border-emerald-200 rounded-lg overflow-x-auto">
        <MermaidDiagram
          code={mermaidCode}
          id="exec-flow-diagram"
          emptyMessage="No execution flow to render."
          loadingMessage="Rendering execution flow..."
        />
      </div>

      {/* Step list */}
      <div className="relative">
        <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-gray-200" />
        <div className="space-y-0">
          {filteredSteps.map((step, i) => {
            const phaseInfo = phases?.find((p) => p.phase === step.phase);
            const color = step.color || phaseInfo?.color || '#94a3b8';

            return (
              <div key={i} className="flex items-start gap-4 relative group">
                <div
                  className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 relative z-10 mt-1 shadow-sm transition-transform group-hover:scale-110"
                  style={{ backgroundColor: color }}
                >
                  {step.step || i + 1}
                </div>
                <div className="py-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm ${step.depth === 0 ? 'font-bold' : 'font-medium'} text-gray-700`}>
                      {step.description}
                    </p>
                    {step.depth > 0 && (
                      <span className="text-[10px] text-gray-400 bg-gray-50 px-1.5 rounded">
                        depth {step.depth}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span>{step.file?.split('/').pop()}</span>
                    {step.phase && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{ backgroundColor: `${color}20`, color }}
                      >
                        {step.phase}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase legend */}
      {phases && phases.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2">
          {phases
            .filter((p) => steps.some((s) => s.phase === p.phase))
            .map((phase, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: phase.color }} />
                {phase.label}
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
