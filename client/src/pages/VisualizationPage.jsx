import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStaticAnalysis } from '../api/staticAnalysis.api';
import DiagramControls from '../components/visualization/DiagramControls';
import DependencyGraph from '../components/visualization/DependencyGraph';
import ModuleRelationshipGraph from '../components/visualization/ModuleRelationshipGraph';
import CallGraph from '../components/visualization/CallGraph';
import APIFlowDiagram from '../components/visualization/APIFlowDiagram';
import DatabaseERDiagram from '../components/visualization/DatabaseERDiagram';
import ExecutionFlow from '../components/visualization/ExecutionFlow';
import SequenceDiagram from '../components/visualization/SequenceDiagram';
import { ErrorState, Spinner } from '../components/common/Feedback';

export default function VisualizationPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeDiagram, setActiveDiagram] = useState('dependencyGraph');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getStaticAnalysis(id);
        setData(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analysis data');
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (loading) return <Spinner size="lg" className="min-h-[60vh]" />;
  if (error) return <ErrorState message={error} />;

  const diagrams = data?.diagrams || {};
  const folderStructure = data?.folderStructure;
  const metrics = data?.metrics;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Project Visualizations</h1>
          <p className="text-surface-500 mt-1 text-sm">
            {data?.projectName} — Interactive D3.js graphs & Mermaid diagrams
          </p>
        </div>
        <Link
          to={`/projects/${id}`}
          className="btn-ghost px-4 py-2 text-sm inline-flex items-center gap-1"
        >
          Analysis Page →
        </Link>
      </div>

      <div className="mb-6">
        <DiagramControls
          activeDiagram={activeDiagram}
          onDiagramChange={setActiveDiagram}
          diagrams={diagrams}
        />
      </div>

      <div className="section-card mb-8">
        {activeDiagram === 'dependencyGraph' && <DependencyGraph dependencyGraph={diagrams.dependencyGraph} />}
        {activeDiagram === 'moduleGraph' && <ModuleRelationshipGraph simplifiedGraph={diagrams.simplifiedGraph} />}
        {activeDiagram === 'callGraph' && (
          <CallGraph symbols={data?.parserMetadata?.symbols} imports={data?.parserMetadata?.imports} />
        )}
        {activeDiagram === 'apiFlow' && <APIFlowDiagram apiFlow={diagrams.apiFlow} />}
        {activeDiagram === 'databaseER' && <DatabaseERDiagram databaseER={diagrams.databaseER} />}
        {activeDiagram === 'executionFlow' && <ExecutionFlow executionFlow={diagrams.executionFlow} />}
        {activeDiagram === 'sequenceDiagram' && <SequenceDiagram apiFlow={diagrams.apiFlow} />}
      </div>

      {folderStructure?.text && (
        <div className="section-card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-surface-900">Folder Structure</h2>
            <span className="text-xs text-surface-400 bg-white/50 px-3 py-1 rounded-full font-medium border border-emerald-200">
              {metrics?.folderCount || '?'} directories · {metrics?.totalFiles || '?'} files
            </span>
          </div>
          <pre className="bg-white/70 rounded-xl p-6 text-sm text-surface-700 font-mono leading-relaxed overflow-x-auto whitespace-pre max-h-[600px] overflow-y-auto scrollbar-thin border border-emerald-200">
            {folderStructure.text}
          </pre>
        </div>
      )}
    </div>
  );
}
