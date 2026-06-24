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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
        <p className="text-gray-500 mt-4">Loading analysis data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load</h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
          &larr; Back to Dashboard
        </Link>
      </div>
    );
  }

  const diagrams = data?.diagrams || {};
  const folderStructure = data?.folderStructure;
  const metrics = data?.metrics;
  const parserMetadata = data?.parserMetadata;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Visualizations</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {data?.projectName} &mdash; Interactive D3.js graphs &amp; auto-generated Mermaid diagrams
          </p>
        </div>
        <Link
          to={`/projects/${id}`}
          className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium"
        >
          Analysis Page &rarr;
        </Link>
      </div>

      {/* Diagram Controls */}
      <div className="mb-6">
        <DiagramControls
          activeDiagram={activeDiagram}
          onDiagramChange={setActiveDiagram}
          diagrams={diagrams}
        />
      </div>

      {/* Active Diagram */}
      <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6 mb-8">
        {activeDiagram === 'dependencyGraph' && <DependencyGraph dependencyGraph={diagrams.dependencyGraph} />}
        {activeDiagram === 'moduleGraph' && <ModuleRelationshipGraph simplifiedGraph={diagrams.simplifiedGraph} />}
        {activeDiagram === 'callGraph' && (
          <CallGraph symbols={parserMetadata?.symbols} imports={parserMetadata?.imports} />
        )}
        {activeDiagram === 'apiFlow' && <APIFlowDiagram apiFlow={diagrams.apiFlow} />}
        {activeDiagram === 'databaseER' && <DatabaseERDiagram databaseER={diagrams.databaseER} />}
        {activeDiagram === 'executionFlow' && <ExecutionFlow executionFlow={diagrams.executionFlow} />}
        {activeDiagram === 'sequenceDiagram' && <SequenceDiagram apiFlow={diagrams.apiFlow} />}
      </div>

      {/* Folder Structure Tree */}
      {folderStructure?.text && (
        <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Folder Structure</h2>
            <span className="text-xs text-gray-400 bg-white/50 px-2.5 py-1 rounded-full">
              {metrics?.folderCount || '?'} directories &middot; {metrics?.totalFiles || '?'} files
            </span>
          </div>
          <pre className="bg-white/70 rounded-xl p-6 text-sm text-gray-700 font-mono leading-relaxed overflow-x-auto whitespace-pre max-h-[600px] overflow-y-auto">
            {folderStructure.text}
          </pre>
        </div>
      )}
    </div>
  );
}
