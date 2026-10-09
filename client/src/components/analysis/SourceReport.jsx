export default function SourceReport({ analysis }) {
  const routes = analysis.api?.endpoints || [];
  const models = analysis.database?.models || [];
  const layers = Object.entries(analysis.architecture?.layers || {});
  return (
    <section className="section-card space-y-5">
      <div>
        <h2 className="text-xl font-bold">Source Code Report</h2>
        <p className="text-sm text-surface-500 mt-1">Extracted directly from your repository. Available independently of AI explanations.</p>
      </div>
      <p><strong>Languages:</strong> {analysis.techStack?.languages?.join(', ') || 'Not detected'}</p>
      <p><strong>Frameworks:</strong> {analysis.techStack?.frameworks?.map(item => item.name).join(', ') || 'Not detected'}</p>
      <p><strong>Entry point:</strong> {analysis.metrics?.entryPoint || 'Not detected'}</p>
      {layers.length > 0 && <div className="flex flex-wrap gap-3">{layers.map(([name, layer]) => (
        <span key={name} className="badge-info">{name}: {layer.count} files</span>
      ))}</div>}
      <p><strong>Authentication:</strong> {analysis.authentication?.mechanisms?.join(', ') || 'Not detected'}</p>
      <p><strong>Dependencies:</strong> {analysis.dependencies?.allDependencies?.length || 0} imports; {analysis.dependencies?.unresolvedImports?.length || 0} unresolved; {analysis.dependencies?.circularDependencies?.length || 0} circular chains</p>
      {routes.length > 0 && <details>
        <summary className="cursor-pointer font-semibold">API endpoints ({routes.length})</summary>
        <div className="overflow-auto max-h-80 mt-3">
          <table className="w-full text-sm text-left"><thead><tr><th>Method</th><th>Path</th><th>File</th></tr></thead>
            <tbody>{routes.map((route, index) => <tr key={index} className="border-t border-surface-100"><td className="py-2">{route.method}</td><td>{route.path}</td><td>{route.file}</td></tr>)}</tbody>
          </table>
        </div>
      </details>}
      {models.length > 0 && <details>
        <summary className="cursor-pointer font-semibold">Database models ({models.length})</summary>
        <ul className="list-disc pl-5 mt-3">{models.map((model, index) => <li key={index}>{model.name}: {model.fields?.map(field => field.name).join(', ')}</li>)}</ul>
      </details>}
      {analysis.folderStructure?.text && <details>
        <summary className="cursor-pointer font-semibold">Folder structure</summary>
        <pre className="overflow-auto max-h-80 text-xs mt-3">{analysis.folderStructure.text}</pre>
      </details>}
    </section>
  );
}
