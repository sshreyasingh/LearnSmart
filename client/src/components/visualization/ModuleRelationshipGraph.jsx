import { useMemo } from 'react';
import D3GraphContainer from './D3GraphContainer';
import { toD3ModuleGraph } from '../../utils/d3Transformers';

export default function ModuleRelationshipGraph({ simplifiedGraph }) {
  const { nodes, links } = useMemo(() => toD3ModuleGraph(simplifiedGraph), [simplifiedGraph]);

  if (!simplifiedGraph || !nodes.length) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No module relationship data available.
      </div>
    );
  }

  const layerColors = [
    { label: 'Entry', color: '#a855f7' },
    { label: 'Page', color: '#3b82f6' },
    { label: 'Component', color: '#6366f1' },
    { label: 'Hook', color: '#06b6d4' },
    { label: 'Service', color: '#22c55e' },
    { label: 'Controller', color: '#eab308' },
    { label: 'Model', color: '#ef4444' },
    { label: 'Config', color: '#78716c' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Module Relationships</h3>
          <p className="text-xs text-gray-400">
            {nodes.length} layers &middot; {links.length} dependencies
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {layerColors.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-gray-500">{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <D3GraphContainer
        nodes={nodes}
        links={links}
        height={500}
        emptyMessage="No module relationships available."
      />
    </div>
  );
}
