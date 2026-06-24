import { useState } from 'react';

const CATEGORY_LABELS = {
  skills: 'Skills to Learn',
  purpose: 'Purpose',
  architecture: 'Architecture',
  workflow: 'Workflow',
  authentication: 'Authentication',
  api: 'API',
  database: 'Database',
};

const CATEGORY_ICONS = {
  skills: '📚',
  purpose: '🎯',
  architecture: '🏗️',
  workflow: '🔄',
  authentication: '🔐',
  api: '🌐',
  database: '🗄️',
};

function AuthCard({ data }) {
  const d = data || {};
  if (d.authNotDetected) {
    return <p className="text-sm text-gray-500 italic">No authentication system detected in this project.</p>;
  }

  const hasContent = d.authMechanisms || d.login || d.tokenStrategy || d.authorization || d.securityAnalysis;
  if (!hasContent) {
    return <p className="text-sm text-gray-500 italic">AI is analyzing the authentication system. Details will appear here shortly.</p>;
  }

  return (
    <div className="space-y-4">
      {d.authMechanisms && d.authMechanisms.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {d.authMechanisms.map((m, i) => (
            <span key={i} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{m}</span>
          ))}
        </div>
      )}

      {d.login && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Login Flow</h4>
          <ol className="text-sm text-gray-700 space-y-0.5 list-decimal list-inside">
            {d.login.flow.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        </div>
      )}

      {d.tokenStrategy && (
        <div className="grid grid-cols-2 gap-3">
          {d.tokenStrategy.accessToken && (
            <div className="bg-white/80 rounded-lg p-3 border border-emerald-100">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Access Token</div>
              <div className="text-sm text-gray-800">{d.tokenStrategy.accessToken.format}</div>
              <div className="text-xs text-gray-500">{d.tokenStrategy.accessToken.expiry ? `Expiry: ${d.tokenStrategy.accessToken.expiry}` : ''}</div>
            </div>
          )}
          {d.tokenStrategy.refreshToken && (
            <div className="bg-white/60 rounded-lg p-3 border border-emerald-100">
              <div className="text-xs font-semibold text-gray-500 uppercase mb-1">Refresh Token</div>
              <div className="text-sm text-gray-800">{d.tokenStrategy.refreshToken.format}</div>
              <div className="text-xs text-gray-500">{d.tokenStrategy.refreshToken.expiry ? `Expiry: ${d.tokenStrategy.refreshToken.expiry}` : ''}</div>
            </div>
          )}
        </div>
      )}

      {d.authorization && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Authorization</h4>
          <p className="text-sm text-gray-700">Model: {d.authorization.model}</p>
          {d.authorization.roles && d.authorization.roles.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {d.authorization.roles.map((r, i) => (
                <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded text-xs">{r}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {d.securityAnalysis && (
        <div className="space-y-2">
          {d.securityAnalysis.strengths && d.securityAnalysis.strengths.length > 0 && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-xs font-semibold text-green-800 mb-1">Security Strengths</h4>
              <ul className="text-sm text-green-700 space-y-0.5">
                {d.securityAnalysis.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
              </ul>
            </div>
          )}
          {d.securityAnalysis.recommendations && d.securityAnalysis.recommendations.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <h4 className="text-xs font-semibold text-amber-800 mb-1">Recommendations</h4>
              <ul className="text-sm text-amber-700 space-y-0.5">
                {d.securityAnalysis.recommendations.map((r, i) => <li key={i}>→ {r}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DatabaseCard({ data }) {
  const d = data || {};
  if (d.databaseNotDetected) {
    return <p className="text-sm text-gray-500 italic">No database detected in this project.</p>;
  }

  const hasContent = d.databaseTechnology || d.models || d.relationships || d.dataFlow;
  if (!hasContent) {
    return <p className="text-sm text-gray-500 italic">AI is analyzing the database structure. Details will appear here shortly.</p>;
  }

  return (
    <div className="space-y-4">
      {d.databaseTechnology && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Technology:</span>
          <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-xs font-medium">{d.databaseTechnology}</span>
        </div>
      )}

      {d.dataFlow && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Data Flow</h4>
          <p className="text-sm text-gray-700">{d.dataFlow}</p>
        </div>
      )}

      {d.models && d.models.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Models ({d.models.length})</h4>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {d.models.map((model, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="font-medium text-sm text-gray-900">{model.name}</div>
                {model.collection && (
                  <div className="text-xs text-gray-500 font-mono mt-0.5">{model.collection}</div>
                )}
                {model.fields && model.fields.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {model.fields.slice(0, 10).map((f, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <span className="font-mono text-gray-800">{f.name}</span>
                        <span className="text-gray-500">{f.type}</span>
                        {f.required && <span className="text-red-400 text-xs">required</span>}
                        {f.ref && <span className="text-blue-400 text-xs">→ {f.ref}</span>}
                      </div>
                    ))}
                    {model.fields.length > 10 && (
                      <div className="text-xs text-gray-400 mt-1">+{model.fields.length - 10} more fields</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {d.relationships && d.relationships.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Relationships</h4>
          <div className="space-y-1">
            {d.relationships.map((rel, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-800">{rel.from}</span>
                <span className="text-gray-500">—{rel.type}→</span>
                <span className="font-medium text-gray-800">{rel.to}</span>
                {rel.throughField && (
                  <span className="text-gray-400 font-mono text-xs">via {rel.throughField}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillsCard({ data }) {
  if (!data) {
    return <p className="text-sm text-gray-500 italic">No skill recommendations available yet.</p>;
  }

  const { resources, concepts } = data;
  if (!resources || resources.length === 0) {
    return <p className="text-sm text-gray-500 italic">No learning resources detected for this project.</p>;
  }

  const categories = {};
  for (const r of resources) {
    const cat = r.category || 'general';
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push(r);
  }

  const categoryOrder = ['language', 'frontend', 'backend', 'database', 'authentication', 'api', 'testing', 'build', 'deployment', 'security', 'utility', 'general'];

  return (
    <div className="space-y-5">
      {categoryOrder.filter(c => categories[c]).map(cat => (
        <div key={cat}>
          <h4 className="text-sm font-semibold text-gray-900 capitalize mb-2">{cat === 'deployment' ? 'DevOps & Deployment' : cat}</h4>
          <div className="space-y-2">
            {categories[cat].map((tech) => (
              <div key={tech.technology} className="bg-white/60 rounded-lg p-3 border border-emerald-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-900">{tech.technology}</span>
                  <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">
                    {Math.round((tech.confidence || 0.5) * 100)}% match
                  </span>
                </div>
                {tech.keyConcepts && tech.keyConcepts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tech.keyConcepts.map((c, i) => (
                      <span key={i} className="text-xs bg-primary-50 text-primary-700 px-2 py-0.5 rounded-md border border-primary-100">
                        {c}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {concepts && Object.keys(concepts).length > 0 && (
        <div className="pt-3 border-t border-emerald-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Cross-Cutting Concepts</h4>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(concepts)
              .sort((a, b) => b[1].length - a[1].length)
              .slice(0, 15)
              .map(([concept, techs]) => (
                <span
                  key={concept}
                  className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full border border-amber-200"
                  title={`Used in: ${techs.join(', ')}`}
                >
                  {concept}
                  <span className="ml-1 text-amber-400 font-medium">{techs.length}</span>
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PurposeCard({ data }) {
  const d = data || {};
  const hasContent = d.whatItDoes || d.mainFeatures || d.targetAudience || d.problemSolved || d.techHighlights;

  if (!hasContent) {
    return <p className="text-sm text-gray-500 italic">AI is analyzing the project purpose...</p>;
  }

  return (
    <div className="space-y-4">
      {d.whatItDoes && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">What It Does</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{d.whatItDoes}</p>
        </div>
      )}

      {d.problemSolved && (
        <div className="bg-white/60 rounded-lg p-4 border border-emerald-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Problem Solved</h4>
          <p className="text-sm text-gray-700 leading-relaxed">{d.problemSolved}</p>
        </div>
      )}

      {d.mainFeatures && d.mainFeatures.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Key Features</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {d.mainFeatures.map((f, i) => (
              <div key={i} className="flex items-start gap-2 bg-white/40 rounded-lg p-3 border border-gray-100">
                <span className="text-emerald-500 text-sm mt-0.5 shrink-0">✦</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{typeof f === 'string' ? f : f.name || f.title || ''}</p>
                  {typeof f === 'object' && (f.description || f.detail) && (
                    <p className="text-xs text-gray-500 mt-0.5">{f.description || f.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.targetAudience && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Target Audience</h4>
          <p className="text-sm text-gray-700">{typeof d.targetAudience === 'string' ? d.targetAudience : d.targetAudience.join(', ')}</p>
        </div>
      )}

      {d.techHighlights && d.techHighlights.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Technology Highlights</h4>
          <div className="flex flex-wrap gap-1.5">
            {d.techHighlights.map((t, i) => (
              <span key={i} className="px-2 py-0.5 bg-primary-50 text-primary-700 rounded text-xs font-medium border border-primary-100">
                {typeof t === 'string' ? t : t.name || t.technology || ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ArchitectureCard({ data }) {
  const d = data || {};
  const hasContent = d.architecturalStyle || d.patternsIdentified || d.layers || d.designDecisions;

  if (!hasContent) {
    return <p className="text-sm text-gray-500 italic">AI is analyzing the architecture...</p>;
  }

  return (
    <div className="space-y-4">
      {d.architecturalStyle && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Style:</span>
          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">{d.architecturalStyle}</span>
        </div>
      )}

      {d.patternsIdentified && d.patternsIdentified.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Patterns Identified</h4>
          <div className="flex flex-wrap gap-1.5">
            {d.patternsIdentified.map((p, i) => (
              <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs font-medium">{p}</span>
            ))}
          </div>
        </div>
      )}

      {d.layers && d.layers.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Layers</h4>
          <div className="space-y-1.5">
            {d.layers.map((layer, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                <span className="font-medium text-gray-800">{layer.name || layer}</span>
                {layer.responsibility && <span className="text-gray-500">— {layer.responsibility}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {d.dataFlow && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Data Flow</h4>
          <p className="text-sm text-gray-700">{typeof d.dataFlow === 'string' ? d.dataFlow : d.dataFlow.description || JSON.stringify(d.dataFlow)}</p>
        </div>
      )}

      {d.designDecisions && d.designDecisions.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Design Decisions</h4>
          <ul className="space-y-1">
            {d.designDecisions.map((dd, i) => (
              <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-indigo-200">
                <span className="font-medium">{dd.decision || dd.topic || 'Decision'}:</span> {dd.rationale || dd.detail || dd}
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.strengths && d.strengths.length > 0 && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <h4 className="text-xs font-semibold text-green-800 mb-1">Strengths</h4>
          <ul className="text-sm text-green-700 space-y-0.5">
            {d.strengths.map((s, i) => <li key={i}>✓ {s}</li>)}
          </ul>
        </div>
      )}

      {d.weaknesses && d.weaknesses.length > 0 && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h4 className="text-xs font-semibold text-amber-800 mb-1">Considerations</h4>
          <ul className="text-sm text-amber-700 space-y-0.5">
            {d.weaknesses.map((w, i) => <li key={i}>→ {w}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

function WorkflowCard({ data }) {
  const d = data || {};
  const hasContent = d.entryPoints || d.requestLifecycle || d.middlewareChain || d.errorHandling;

  if (!hasContent) {
    return <p className="text-sm text-gray-500 italic">AI is analyzing the workflow...</p>;
  }

  return (
    <div className="space-y-4">
      {d.entryPoints && d.entryPoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Entry Points</h4>
          <ul className="space-y-1">
            {d.entryPoints.map((ep, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="text-emerald-500">▶</span>
                {ep.path || ep.file || ep}
                {ep.method && <span className="text-xs text-gray-400 font-mono">[{ep.method}]</span>}
                {ep.description && <span className="text-gray-500">— {ep.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {d.bootstrap && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Bootstrap Sequence</h4>
          <p className="text-sm text-gray-700">{typeof d.bootstrap === 'string' ? d.bootstrap : d.bootstrap.description || JSON.stringify(d.bootstrap)}</p>
        </div>
      )}

      {d.requestLifecycle && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Request Lifecycle</h4>
          <ol className="text-sm text-gray-700 space-y-0.5 list-decimal list-inside">
            {(Array.isArray(d.requestLifecycle) ? d.requestLifecycle : d.requestLifecycle.steps || []).map((step, i) => (
              <li key={i}>{step.step || step.action || step}</li>
            ))}
          </ol>
        </div>
      )}

      {d.middlewareChain && d.middlewareChain.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Middleware Chain</h4>
          <div className="flex flex-wrap items-center gap-1">
            {d.middlewareChain.map((mw, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="px-2 py-0.5 bg-cyan-50 text-cyan-700 rounded text-xs font-mono">{mw.name || mw}</span>
                {i < d.middlewareChain.length - 1 && <span className="text-gray-300">→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {d.errorHandling && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Error Handling</h4>
          <p className="text-sm text-gray-700">{typeof d.errorHandling === 'string' ? d.errorHandling : d.errorHandling.strategy || JSON.stringify(d.errorHandling)}</p>
        </div>
      )}

      {d.backgroundProcesses && d.backgroundProcesses.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Background Processes</h4>
          <ul className="space-y-1">
            {d.backgroundProcesses.map((bp, i) => (
              <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {bp.name || bp.process || bp}
                {bp.description && <span className="text-gray-500">— {bp.description}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ApiCard({ data }) {
  const d = data || {};
  const hasContent = d.apiStyle || d.endpoints || d.basePrefix;

  if (!hasContent) {
    return <p className="text-sm text-gray-500 italic">AI is analyzing the API structure...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {d.apiStyle && (
          <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">{d.apiStyle}</span>
        )}
        {d.basePrefix && (
          <span className="text-xs font-mono text-gray-500 bg-white/60 px-2 py-0.5 rounded">{d.basePrefix}</span>
        )}
        {d.apiVersioning && (
          <span className="text-xs text-gray-400">{d.apiVersioning}</span>
        )}
      </div>

      {d.endpoints && d.endpoints.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-2">Endpoints ({d.endpoints.length})</h4>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {d.endpoints.slice(0, 40).map((ep, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-white/40 rounded px-2 py-1">
                <span className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded ${
                  ep.method === 'GET' ? 'bg-green-100 text-green-700' :
                  ep.method === 'POST' ? 'bg-blue-100 text-blue-700' :
                  ep.method === 'PUT' ? 'bg-amber-100 text-amber-700' :
                  ep.method === 'DELETE' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {ep.method || 'ANY'}
                </span>
                <span className="font-mono text-gray-800">{ep.path || ep.route || ''}</span>
                {ep.description && <span className="text-gray-400 ml-auto text-xs">{ep.description}</span>}
              </div>
            ))}
            {d.endpoints.length > 40 && (
              <p className="text-xs text-gray-400 mt-1">+{d.endpoints.length - 40} more endpoints</p>
            )}
          </div>
        </div>
      )}

      {d.errorFormat && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Error Format</h4>
          <p className="text-sm text-gray-700">{typeof d.errorFormat === 'string' ? d.errorFormat : d.errorFormat.description || JSON.stringify(d.errorFormat)}</p>
        </div>
      )}

      {d.rateLimiting && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Rate Limiting</h4>
          <p className="text-sm text-gray-700">{typeof d.rateLimiting === 'string' ? d.rateLimiting : d.rateLimiting.description || JSON.stringify(d.rateLimiting)}</p>
        </div>
      )}

      {d.globalMiddleware && d.globalMiddleware.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Global Middleware</h4>
          <div className="flex flex-wrap gap-1.5">
            {d.globalMiddleware.map((gm, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{gm.name || gm}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const CARD_RENDERERS = {
  skills: SkillsCard,
  purpose: PurposeCard,
  architecture: ArchitectureCard,
  workflow: WorkflowCard,
  authentication: AuthCard,
  api: ApiCard,
  database: DatabaseCard,
};

export function ExplanationCards({ explanations, learningResources }) {
  const [activeTab, setActiveTab] = useState('skills');

  if (!explanations) {
    return (
      <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Analysis</h2>
        <p className="text-gray-500 text-sm">Analysis is still being generated. If this persists, try re-analyzing the project.</p>
      </div>
    );
  }

  const allKeys = Object.keys(explanations);
  const categories = allKeys.filter((k) => explanations[k] && !explanations[k].error);
  const errorCategories = allKeys.filter((k) => explanations[k] && explanations[k].error);

  // Skills tab: data comes from learningResources prop, not explanations
  const hasSkills = learningResources && learningResources.resources && learningResources.resources.length > 0;

  let tabCategories = [...categories];
  if (hasSkills) tabCategories = ['skills', ...tabCategories];

  const validTabs = [...tabCategories, ...errorCategories];
  const hasData = tabCategories.length > 0;
  const displayTab = validTabs.includes(activeTab) ? activeTab : (hasData ? tabCategories[0] : validTabs[0]);
  const isSkillsTab = displayTab === 'skills';
  const activeData = isSkillsTab ? learningResources : explanations[displayTab];
  const isErrorTab = !isSkillsTab && errorCategories.includes(displayTab);
  const Renderer = CARD_RENDERERS[displayTab];

  return (
    <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">Detailed Analysis</h2>

      {errorCategories.length > 0 && !hasSkills && !hasKnowledgeGraph && categories.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-4 text-sm">
          All analysis categories encountered issues: {errorCategories.map(k => CATEGORY_LABELS[k] || k).join(', ')}
        </div>
      )}

      {validTabs.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {tabCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                displayTab === cat
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/60 text-gray-600 hover:bg-white'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '📋'}</span>
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
          {errorCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                displayTab === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>{CATEGORY_ICONS[cat] || '⚠️'}</span>
              {CATEGORY_LABELS[cat] || cat}
            </button>
          ))}
        </div>
      )}

      {!hasData && !activeData?.error && (
        <div className="space-y-3">
          {errorCategories.map((cat) => {
            const err = explanations[cat];
            return (
              <div key={cat} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-red-800">{CATEGORY_LABELS[cat] || cat}</h4>
                <p className="text-sm text-red-600 mt-1">{err?.error || 'Unknown error'}</p>
                <p className="text-xs text-red-400 mt-2">
                  Check that your OpenRouter API key has credits at https://openrouter.ai/settings/credits
                </p>
              </div>
            );
          })}
        </div>
      )}

      {isErrorTab && activeData?.error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-red-800">{CATEGORY_LABELS[displayTab] || displayTab}</h4>
          <p className="text-sm text-red-600 mt-1">{activeData.error}</p>
        </div>
      )}

      {hasData && !isErrorTab && Renderer ? (
        <Renderer data={activeData} />
      ) : hasData && !isErrorTab ? (
        <pre className="text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(activeData, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
