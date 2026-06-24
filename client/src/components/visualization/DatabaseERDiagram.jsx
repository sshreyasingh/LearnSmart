import { useMemo } from 'react';
import MermaidDiagram from './MermaidDiagram';
import { buildERMermaid } from '../../utils/mermaidBuilders';

export default function DatabaseERDiagram({ databaseER }) {
  const mermaidCode = useMemo(() => buildERMermaid(databaseER), [databaseER]);

  const { models, relationships, operations } = databaseER || { models: [], relationships: [], operations: [] };

  if (!models || models.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        No database models detected.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Database ER Diagram</h3>
          <p className="text-xs text-gray-400">
            {models.length} models &middot; {relationships.length} relationships
          </p>
        </div>
      </div>

      {/* Mermaid ER Diagram */}
      <div className="bg-white/40 border border-emerald-200 rounded-lg overflow-x-auto">
        <MermaidDiagram
          code={mermaidCode}
          id="db-er-diagram"
          emptyMessage="No ER diagram to render."
          loadingMessage="Rendering ER diagram..."
        />
      </div>

      {/* Models */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {models.map((model, i) => {
          const borderColor =
            model.fields.length > 10
              ? '#f59e0b'
              : model.fields.length > 5
              ? '#3b82f6'
              : '#22c55e';
          return (
            <div key={i} className="bg-white rounded-xl border-2 overflow-hidden" style={{ borderColor }}>
              <div className="px-4 py-3" style={{ backgroundColor: borderColor }}>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-white">{model.name}</p>
                  <span className="text-xs text-white/80">
                    {model.collection || model.name.toLowerCase() + 's'}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                {model.fields.map((field, fi) => (
                  <div key={fi} className="px-4 py-2 flex items-center gap-3 text-sm">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        field.required
                          ? 'bg-red-400'
                          : field.unique
                          ? 'bg-purple-400'
                          : field.ref
                          ? 'bg-blue-400'
                          : 'bg-gray-300'
                      }`}
                    />
                    <span className="font-mono text-gray-800 min-w-[100px]">{field.name}</span>
                    <span className="text-gray-400 text-xs">{field.type}</span>
                    <div className="flex items-center gap-1 ml-auto">
                      {field.required && (
                        <span className="text-[10px] text-red-500 font-medium">REQ</span>
                      )}
                      {field.unique && (
                        <span className="text-[10px] text-purple-500 font-medium">UNQ</span>
                      )}
                      {field.ref && (
                        <span className="text-[10px] text-blue-500 font-medium bg-blue-50 px-1.5 rounded">
                          &rarr; {field.ref}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 bg-gray-50 text-xs text-gray-400 flex items-center justify-between">
                <span>{model.fields.length} fields</span>
                {model.hasTimestamps && <span className="text-green-500">timestamps</span>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Relationships */}
      {relationships.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Relationships
          </p>
          <div className="space-y-2">
            {relationships.map((rel, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-lg border border-gray-100"
              >
                <span className="font-bold text-gray-800 text-sm">{rel.from}</span>
                <div className="flex items-center gap-1.5 text-xs">
                  {rel.type === 'one-to-many' ? (
                    <>
                      <span className="text-gray-400 font-medium text-sm">&rarr;</span>
                      <span className="text-gray-400 font-medium">1 to N</span>
                    </>
                  ) : (
                    <span className="text-gray-400 font-medium">1 to 1</span>
                  )}
                </div>
                <span className="font-bold text-gray-800 text-sm">{rel.to}</span>
                <span className="text-xs text-gray-400 ml-auto">via {rel.throughField}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operations */}
      {operations && operations.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Database Operations
          </p>
          <div className="space-y-1">
            {operations.slice(0, 20).map((op, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 text-xs">
                <span className="text-gray-400 w-6">{op.step}.</span>
                <span className="text-gray-700">{op.description}</span>
                <span className="text-gray-400 ml-auto">{op.file?.split('/').pop()}</span>
              </div>
            ))}
            {operations.length > 20 && (
              <p className="text-xs text-gray-400 px-3">+{operations.length - 20} more operations</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
