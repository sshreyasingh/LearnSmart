import { useMemo } from 'react';
import MermaidDiagram from './MermaidDiagram';
import { buildSequenceMermaid } from '../../utils/mermaidBuilders';

export default function SequenceDiagram({ apiFlow }) {
  const mermaidCode = useMemo(() => buildSequenceMermaid(apiFlow), [apiFlow]);

  const { routes = [], flowSteps = [] } = apiFlow || {};

  if (!routes.length && !flowSteps.length) {
    return (
      <div className="text-center py-8 text-surface-500 text-sm">
        No sequence diagram data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-surface-800">Sequence Diagram</h3>
          <p className="text-xs text-surface-500">
            {routes.length} API calls &middot; {flowSteps.length} lifecycle steps
          </p>
        </div>
      </div>

      <div className="bg-surface-100/40 border border-surface-300 rounded-lg overflow-x-auto">
        <MermaidDiagram
          code={mermaidCode}
          id="sequence-diagram"
          emptyMessage="No sequence diagram to render."
          loadingMessage="Rendering sequence diagram..."
        />
      </div>

      <p className="text-xs text-surface-500">
        This diagram shows the request lifecycle: Client &rarr; Server &rarr; Database interactions for each API
        endpoint.
      </p>
    </div>
  );
}
