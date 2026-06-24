import { useState, useMemo } from 'react';
import { useD3ForceSimulation } from '../../hooks/useD3ForceSimulation';

function LoadingState({ message }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="text-gray-500 text-sm mt-3">{message || 'Loading graph...'}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="flex items-center justify-center py-16">
      <p className="text-gray-400 text-sm">{message || 'No data available.'}</p>
    </div>
  );
}

function ErrorState({ message }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-600 text-sm">Failed to render: {message}</p>
    </div>
  );
}

export default function D3GraphContainer({
  nodes = [],
  links = [],
  width,
  height = 500,
  nodeConfig,
  linkConfig,
  loading = false,
  error = null,
  emptyMessage = 'No graph data available.',
  loadingMessage = 'Loading graph...',
  onNodeClick,
  className = '',
  children,
}) {
  const containerHeight = height;
  const { svgRef } = useD3ForceSimulation(nodes, links, width || 800, containerHeight, {
    onNodeClick,
  });

  const [selectedNode, setSelectedNode] = useState(null);

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (onNodeClick) onNodeClick(node);
  };

  if (loading) return <LoadingState message={loadingMessage} />;
  if (error) return <ErrorState message={error} />;
  if (!nodes.length) return <EmptyState message={emptyMessage} />;

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>{nodes.length} nodes &middot; {links.length} edges</span>
        <span className="text-gray-400">Scroll to zoom &middot; Drag to pan &middot; Click nodes for details</span>
      </div>

      <div
        className="border border-emerald-200 rounded-lg overflow-hidden bg-white/50 relative"
        style={{ height: containerHeight }}
      >
        <svg ref={svgRef} width="100%" height={containerHeight} style={{ display: 'block' }} />
      </div>

      {children && <div className="mt-2">{children}</div>}

      {selectedNode && (
        <div className="p-3 bg-white rounded-lg border border-gray-200 text-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-900">{selectedNode.label || selectedNode.id}</div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
          {selectedNode.metadata && (
            <div className="text-xs text-gray-500 mt-1 space-y-0.5">
              {selectedNode.metadata.path && (
                <div className="font-mono">{selectedNode.metadata.path}</div>
              )}
              {selectedNode.metadata.language && <div>Language: {selectedNode.metadata.language}</div>}
              {selectedNode.metadata.loc && <div>LOC: {selectedNode.metadata.loc}</div>}
              {selectedNode.metadata.fileCount && (
                <div>Files: {selectedNode.metadata.fileCount}</div>
              )}
              {selectedNode.metadata.directory && (
                <div>Directory: {selectedNode.metadata.directory}</div>
              )}
              {selectedNode.type && <div>Type: {selectedNode.type}</div>}
              {selectedNode.group && <div>Group: {selectedNode.group}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
