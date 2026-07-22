import { useMemo } from 'react';
import D3GraphContainer from './D3GraphContainer';
import { toD3CallGraph } from '../../utils/d3Transformers';

export default function CallGraph({ symbols = [], imports = [] }) {
  const { nodes, links } = useMemo(
    () => toD3CallGraph(symbols, imports),
    [symbols, imports]
  );

  if (!nodes.length) {
    return (
      <div className="text-center py-8 text-surface-500 text-sm">
        No call graph data available.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-surface-800">Call Graph</h3>
          <p className="text-xs text-surface-500">
            {nodes.length} symbols &middot; {links.length} calls
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#10b981]" />
            <span className="text-surface-500">Functions</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#6366f1]" />
            <span className="text-surface-500">Files</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full inline-block bg-[#8b5cf6]" />
            <span className="text-surface-500">Classes</span>
          </span>
        </div>
      </div>

      <D3GraphContainer
        nodes={nodes}
        links={links}
        height={500}
        emptyMessage="No symbol/import data available to build a call graph."
      />
    </div>
  );
}
