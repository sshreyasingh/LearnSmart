import { useMemo } from 'react';
import D3GraphContainer from './D3GraphContainer';
import { toD3Graph } from '../../utils/d3Transformers';

export default function DependencyGraph({ dependencyGraph }) {
  const { nodes, links } = useMemo(() => toD3Graph(dependencyGraph), [dependencyGraph]);

  if (!dependencyGraph) {
    return (
      <div className="text-center py-8 text-surface-500 text-sm">
        No dependency data available.
      </div>
    );
  }

  const legendItems = [
    { label: 'JS', color: '#f7df1e' },
    { label: 'TS', color: '#3178c6' },
    { label: 'React', color: '#00d8ff' },
    { label: 'Python', color: '#3572A5' },
    { label: 'Java', color: '#b07219' },
    { label: 'Other', color: '#6b7280' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-surface-800">Dependency Graph</h3>
          <p className="text-xs text-surface-500">
            {nodes.length} files &middot; {links.length} dependencies
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-surface-500 mr-1">Languages:</span>
          {legendItems.map((item) => (
            <span key={item.label} className="flex items-center gap-1">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-surface-500">{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      <D3GraphContainer
        nodes={nodes}
        links={links}
        height={500}
        emptyMessage="No dependency data available."
      />
    </div>
  );
}
