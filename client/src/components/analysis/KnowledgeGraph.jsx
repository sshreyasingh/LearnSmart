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
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
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
    <div className="section-card">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-surface-900">Knowledge Graph</h2>
        {allNodes.length > 0 && <Legend />}
      </div>

      {allNodes.length > 0 && (
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search nodes..."
              className="input-field pl-10 text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <span className="text-xs text-surface-400 font-medium">
            {filteredNodes.length} of {allNodes.length} nodes
          </span>
        </div>
      )}

      <D3GraphContainer
        nodes={filteredNodes}
        links={relatedLinks}
        height={500}
        emptyMessage="Knowledge graph is being generated and will appear here once analysis completes."
      />
    </div>
  );
}
