import { useState, useMemo } from 'react';
import D3GraphContainer from '../visualization/D3GraphContainer';
import { toD3KnowledgeGraph } from '../../utils/d3Transformers';

const NODE_TYPE_COLORS = {
  file: '#3b82f6',
  function: '#10b981',
  class: '#8b5cf6',
  component: '#f59e0b',
  route: '#ef4444',
  package: '#6b7280',
};

function Legend() {
  const types = [
    { label: 'File', color: NODE_TYPE_COLORS.file },
    { label: 'Function', color: NODE_TYPE_COLORS.function },
    { label: 'Class', color: NODE_TYPE_COLORS.class },
    { label: 'Component', color: NODE_TYPE_COLORS.component },
    { label: 'Route', color: NODE_TYPE_COLORS.route },
    { label: 'Package', color: NODE_TYPE_COLORS.package },
  ];

  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {types.map((t) => (
        <span key={t.label} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: t.color }}
          />
          {t.label}
        </span>
      ))}
    </div>
  );
}

export function KnowledgeGraph({ knowledgeGraph }) {
  const [searchTerm, setSearchTerm] = useState('');

  const { nodes: allNodes, links } = useMemo(
    () => toD3KnowledgeGraph(knowledgeGraph),
    [knowledgeGraph]
  );

  const filteredNodes = useMemo(() => {
    if (!searchTerm.trim()) return allNodes;
    const lower = searchTerm.toLowerCase();
    return allNodes.filter(
      (n) =>
        (n.label || '').toLowerCase().includes(lower) ||
        (n.metadata?.sublabel || '').toLowerCase().includes(lower) ||
        (n.metadata?.fullPath || '').toLowerCase().includes(lower) ||
        (n.type || '').toLowerCase().includes(lower)
    );
  }, [allNodes, searchTerm]);

  const relatedLinks = useMemo(() => {
    if (!searchTerm.trim() || !filteredNodes.length) return links;
    const filteredIds = new Set(filteredNodes.map((n) => n.id));
    return links.filter(
      (l) =>
        filteredIds.has(typeof l.source === 'object' ? l.source.id : l.source) ||
        filteredIds.has(typeof l.target === 'object' ? l.target.id : l.target)
    );
  }, [links, filteredNodes, searchTerm]);

  return (
    <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Knowledge Graph</h2>
        {allNodes.length > 0 && <Legend />}
      </div>

      {allNodes.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white/80"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            )}
          </div>
          <span className="text-xs text-gray-400">
            {filteredNodes.length} of {allNodes.length} nodes
          </span>
        </div>
      )}

      <D3GraphContainer
        nodes={filteredNodes}
        links={relatedLinks}
        height={500}
        emptyMessage="Knowledge graph is being generated. It will appear here once analysis completes, showing how files, functions, classes, and components are connected."
      />
    </div>
  );
}
