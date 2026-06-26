function safeId(id) {
  return (id || '').replace(/[^a-zA-Z0-9_]/g, '_').replace(/^_|_$/g, '') || 'node';
}

function safeLabel(label) {
  return (label || '').replace(/["<>]/g, '');
}

export function buildArchitectureMermaid(simplifiedGraph) {
  try {
    const { nodes = [], edges = [] } = simplifiedGraph || {};
    if (!nodes.length) return '';
    let code = 'flowchart TB\n';

    for (const node of nodes) {
      const nid = safeId(node.id);
      const label = safeLabel(node.label || node.id);
      code += `  subgraph ${nid}["${label}"]\n    direction TB\n`;
      const files = node.files || [];
      files.slice(0, 5).forEach((f, i) => {
        const short = f.split(/[/\\]/).pop().replace(/["]/g, '');
        code += `    ${nid}_f${i}["${short}"]\n`;
      });
      if (files.length > 5) {
        code += `    ${nid}_more["+${files.length - 5} more..."]\n`;
      }
      code += '  end\n';
    }

    for (const edge of edges) {
      const from = safeId(edge.source);
      const to = safeId(edge.target);
      if (edge.count > 1) {
        code += `  ${from} -->|"${edge.count} deps"| ${to}\n`;
      } else {
        code += `  ${from} --> ${to}\n`;
      }
    }

    return code;
  } catch (err) {
    console.error('[mermaidBuilders] buildArchitectureMermaid failed:', err);
    return '';
  }
}

export function buildAPIFlowMermaid(apiFlow) {
  try {
    const { routes = [], flowSteps = [] } = apiFlow || {};
    if (!routes.length) return '';
    let code = 'sequenceDiagram\n';
    code += '  participant Client\n';
    code += '  participant Server\n';

    const displayRoutes = routes.slice(0, 15);
    for (const route of displayRoutes) {
      const method = (route.method || 'GET').toUpperCase();
      const path = safeLabel(route.path || '/');
      code += `  Client->>+Server: ${method} ${path}\n`;
      code += `  Server-->>-Client: Response\n`;
    }

    const displaySteps = flowSteps.slice(0, 10);
    for (const step of displaySteps) {
      const desc = safeLabel(step.description || '');
      if (desc) code += `  Note over Server: ${desc}\n`;
    }

    return code;
  } catch (err) {
    console.error('[mermaidBuilders] buildAPIFlowMermaid failed:', err);
    return '';
  }
}

export function buildERMermaid(databaseER) {
  try {
    const { models = [], relationships = [] } = databaseER || {};
    if (!models.length) return '';
    let code = 'erDiagram\n';

    for (const model of models) {
      const name = safeId(model.name);
      code += `  ${name} {\n`;
      const fields = model.fields || [];
      for (const field of fields) {
        const fieldName = safeId(field.name);
        const fieldType = safeId(field.type || 'string');
        const pk = field.name === '_id' || field.name === 'id' ? ' PK' : '';
        const fk = field.ref ? ' FK' : '';
        const req = field.required ? ' NOT_NULL' : '';
        code += `    ${fieldType} ${fieldName}${pk}${fk}${req}\n`;
      }
      code += '  }\n';
    }

    for (const rel of relationships) {
      const from = safeId(rel.from);
      const to = safeId(rel.to);
      if (!from || !to) continue;
      const arrow = rel.type === 'one-to-many' ? '|o--o{' : '|o--||';
      const label = safeLabel(rel.throughField || 'references');
      code += `  ${from} ${arrow} ${to} : "${label}"\n`;
    }

    return code;
  } catch (err) {
    console.error('[mermaidBuilders] buildERMermaid failed:', err);
    return '';
  }
}

export function buildExecutionFlowMermaid(executionFlow) {
  try {
    const { steps = [], phases = [], entryPoint } = executionFlow || {};
    if (!steps.length) return '';
    let code = 'flowchart TD\n';

    const entryLabel = entryPoint ? entryPoint.split(/[/\\]/).pop().replace(/["]/g, '') : '';
    if (entryLabel) {
      code += `  entry["📍 ${safeLabel(entryLabel)}"]\n`;
    }

    const defaultPhases = [{ phase: 'exec', label: 'Execution' }];
    const actualPhases = phases.length ? phases : defaultPhases;
    const phaseStepMap = {};

    for (const phase of actualPhases) {
      const pid = safeId(phase.phase);
      const pSteps = steps.filter((s) => s.phase === phase.phase);
      if (!pSteps.length) continue;
      phaseStepMap[pid] = pSteps;

      const phaseLabel = safeLabel(phase.label || phase.phase);
      code += `  subgraph ${pid}["${phaseLabel}"]\n    direction TB\n`;

      pSteps.forEach((step, i) => {
        const nodeId = `${pid}_s${step.step || i}`;
        const desc = safeLabel(step.description || `Step ${i + 1}`);
        code += `    ${nodeId}["${i + 1}. ${desc}"]\n`;
        if (i > 0) {
          const prevId = `${pid}_s${step.step - 1 || i - 1}`;
          code += `    ${prevId} --> ${nodeId}\n`;
        }
      });

      code += '  end\n';
    }

    const phaseList = Object.keys(phaseStepMap);
    for (let i = 1; i < phaseList.length; i++) {
      const prevSteps = phaseStepMap[phaseList[i - 1]];
      const currSteps = phaseStepMap[phaseList[i]];
      if (prevSteps?.length && currSteps?.length) {
        const lastStep = prevSteps[prevSteps.length - 1];
        const firstStep = currSteps[0];
        const prevId = `${phaseList[i - 1]}_s${lastStep.step || prevSteps.length - 1}`;
        const currId = `${phaseList[i]}_s${firstStep.step || 0}`;
        code += `  ${prevId} --> ${currId}\n`;
      }
    }

    return code;
  } catch (err) {
    console.error('[mermaidBuilders] buildExecutionFlowMermaid failed:', err);
    return '';
  }
}

export function buildSequenceMermaid(apiFlow) {
  try {
    const { routes = [], flowSteps = [] } = apiFlow || {};
    if (!routes.length && !flowSteps.length) return '';
    let code = 'sequenceDiagram\n';
    code += '  participant Client\n';
    code += '  participant Server\n';
    code += '  participant Database\n';

    const displayRoutes = routes.slice(0, 12);
    for (const route of displayRoutes) {
      const method = (route.method || 'GET').toUpperCase();
      const path = safeLabel(route.path || '/');
      code += `  Client->>+Server: ${method} ${path}\n`;
      code += '  Server->>+Database: Query\n';
      code += '  Database-->>-Server: Result\n';
      code += '  Server-->>-Client: Response\n';
    }

    const displaySteps = flowSteps.slice(0, 8);
    for (const step of displaySteps) {
      const desc = safeLabel(step.description || '');
      if (desc) code += `  Note over Server: ${desc}\n`;
    }

    return code;
  } catch (err) {
    console.error('[mermaidBuilders] buildSequenceMermaid failed:', err);
    return '';
  }
}
