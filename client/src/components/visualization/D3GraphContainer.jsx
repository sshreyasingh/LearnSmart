import { useState } from 'react';
import { useD3ForceSimulation } from '../../hooks/useD3ForceSimulation';
import { Spinner } from '../common/Feedback';

function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 bg-surface-100 rounded-xl flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
        </div>
        <p className="text-surface-400 text-sm">{message || 'No data available.'}</p>
      </div>
    </div>
  );
}

export default function D3GraphContainer({
  nodes = [],
  links = [],
  width,
  height = 500,
  loading = false,
  error = null,
  emptyMessage = 'No graph data available.',
  loadingMessage = 'Loading graph...',
  onNodeClick,
  className = '',
}) {
  const { svgRef } = useD3ForceSimulation(nodes, links, width || 800, height, { onNodeClick });
  const [selectedNode, setSelectedNode] = useState(null);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (onNodeClick) onNodeClick(node);
  };

  if (loading) return <Spinner size="md" className="py-20" />;
  if (error) return <EmptyState message={error} />;
  if (!nodes.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs text-surface-400 font-medium">
        <span>{nodes.length} nodes · {links.length} edges</span>
        <span>Scroll to zoom · Drag to pan · Click nodes for details</span>
      </div>

      <div
        className="border border-surface-300 rounded-xl overflow-hidden bg-surface-100/50 relative"
        style={{ height }}
      >
        <svg ref={svgRef} width="100%" height={height} style={{ display: 'block' }} />
      </div>

      {selectedNode && (
        <div className="p-4 bg-surface-100 rounded-xl border border-surface-200 shadow-soft text-sm animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-surface-900">{selectedNode.label || selectedNode.id}</div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-surface-400 hover:text-surface-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          {selectedNode.metadata && (
            <div className="text-xs text-surface-500 mt-2 space-y-0.5">
              {selectedNode.metadata.path && <div className="font-mono">{selectedNode.metadata.path}</div>}
              {selectedNode.metadata.language && <div>Language: {selectedNode.metadata.language}</div>}
              {selectedNode.metadata.loc && <div>LOC: {selectedNode.metadata.loc}</div>}
              {selectedNode.metadata.fileCount && <div>Files: {selectedNode.metadata.fileCount}</div>}
              {selectedNode.type && <div>Type: {selectedNode.type}</div>}
              {selectedNode.group && <div>Group: {selectedNode.group}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
