const LANGUAGE_COLORS = {
  JavaScript: '#f7df1e',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  HTML: '#e34f26',
  CSS: '#563d7c',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'C++': '#f34b7d',
  'C#': '#178600',
};

const NODE_TYPE_COLORS = {
  file: '#3b82f6',
  function: '#10b981',
  class: '#8b5cf6',
  component: '#f59e0b',
  route: '#ef4444',
  package: '#6b7280',
};

const EDGE_TYPE_COLORS = {
  imports: '#6366f1',
  calls: '#10b981',
  extends: '#8b5cf6',
  implements: '#ec4899',
  defines: '#94a3b8',
  local: '#6366f1',
  external: '#94a3b8',
};

function getLanguageColor(language) {
  if (!language) return '#6b7280';
  for (const [key, color] of Object.entries(LANGUAGE_COLORS)) {
    if (language.includes(key)) return color;
  }
  return '#6b7280';
}

export function toD3Graph(dependencyGraph) {
  try {
    const { nodes = [], edges = [] } = dependencyGraph || {};
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.label,
        group: n.directory || 'root',
        size: Math.max(5, Math.min((n.symbolCount || 1) * 2, 30)),
        color: getLanguageColor(n.language),
        metadata: { path: n.path, loc: n.loc, language: n.language, directory: n.directory },
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        weight: e.weight || 1,
        type: e.type || 'import',
        color: EDGE_TYPE_COLORS[e.type] || '#94a3b8',
      })),
    };
  } catch (err) {
    console.error('[d3Transformers] toD3Graph failed:', err);
    return { nodes: [], links: [] };
  }
}

export function toD3KnowledgeGraph(knowledgeGraph) {
  try {
    const { nodes = [], edges = [] } = knowledgeGraph || {};
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.data?.label || n.id,
        group: n.type || 'unknown',
        size: n.type === 'package' ? 8 : n.type === 'file' ? 12 : 10,
        color: NODE_TYPE_COLORS[n.type] || '#94a3b8',
        type: n.type,
        metadata: {
          sublabel: n.data?.sublabel || '',
          fullPath: n.data?.fullPath || '',
          language: n.data?.language || '',
        },
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        weight: 1,
        type: e.data?.relationship || 'unknown',
        color: EDGE_TYPE_COLORS[e.data?.relationship] || '#94a3b8',
        label: e.label || '',
      })),
    };
  } catch (err) {
    console.error('[d3Transformers] toD3KnowledgeGraph failed:', err);
    return { nodes: [], links: [] };
  }
}

export function toD3ModuleGraph(simplifiedGraph) {
  try {
    const { nodes = [], edges = [] } = simplifiedGraph || {};
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        label: n.label || n.id,
        group: 'layer',
        size: Math.max(8, Math.min((n.fileCount || 1) * 3, 40)),
        color: getLayerColor(n.id),
        metadata: { fileCount: n.fileCount, totalLOC: n.totalLOC, files: n.files || [] },
      })),
      links: edges.map((e) => ({
        source: e.source,
        target: e.target,
        weight: e.count || 1,
        type: 'dependency',
        color: '#94a3b8',
        label: e.count > 1 ? `${e.count} deps` : '',
      })),
    };
  } catch (err) {
    console.error('[d3Transformers] toD3ModuleGraph failed:', err);
    return { nodes: [], links: [] };
  }
}

export function toD3CallGraph(symbols, imports) {
  try {
    const symbolList = symbols || [];
    const importList = imports || [];
    const fileNodes = new Map();
    const linkSet = new Set();

    for (const imp of importList) {
      const sourceFile = imp.source || 'unknown';
      if (!fileNodes.has(sourceFile)) {
        fileNodes.set(sourceFile, {
          id: sourceFile,
          label: sourceFile.split('/').pop(),
          group: 'file',
          size: 8,
          color: '#6366f1',
          type: 'file',
          metadata: { fullPath: sourceFile },
        });
      }
    }

    for (const sym of symbolList) {
      const filePath = sym.filePath || sym.file || 'unknown';
      const funcName = sym.name || 'anonymous';
      const funcId = `${filePath}::${funcName}`;
      if (!fileNodes.has(funcId)) {
        fileNodes.set(funcId, {
          id: funcId,
          label: funcName.length > 20 ? funcName.slice(0, 18) + '…' : funcName,
          group: sym.kind === 'class' ? 'class' : 'function',
          size: sym.kind === 'class' ? 14 : 10,
          color: sym.kind === 'class' ? '#8b5cf6' : '#10b981',
          type: sym.kind || 'function',
          metadata: { file: filePath, line: sym.line },
        });
      }
    }

    for (const imp of importList) {
      const specifiers = imp.specifiers || [];
      for (const spec of specifiers) {
        const linkKey = `${imp.source}->${spec}`;
        if (!linkSet.has(linkKey)) {
          linkSet.add(linkKey);
        }
      }
    }

    return {
      nodes: [...fileNodes.values()],
      links: [],
    };
  } catch (err) {
    console.error('[d3Transformers] toD3CallGraph failed:', err);
    return { nodes: [], links: [] };
  }
}

function getLayerColor(layerId) {
  const layerColors = {
    entry: '#a855f7',
    page: '#3b82f6',
    component: '#6366f1',
    hook: '#06b6d4',
    context: '#14b8a6',
    service: '#22c55e',
    controller: '#eab308',
    route: '#f97316',
    middleware: '#84cc16',
    model: '#ef4444',
    schema: '#ec4899',
    util: '#6b7280',
    config: '#78716c',
    test: '#10b981',
    other: '#9ca3af',
  };
  return layerColors[layerId] || '#9ca3af';
}
