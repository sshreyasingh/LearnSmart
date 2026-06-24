import { useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAnalysis } from '../hooks/useAnalysis';
import { ProjectOverview } from '../components/analysis/ProjectOverview';
import { ArchitectureGraph } from '../components/analysis/ArchitectureGraph';
import { ExplanationCards } from '../components/analysis/ExplanationCards';
import { KnowledgeGraph } from '../components/analysis/KnowledgeGraph';
import { InterviewQuestionsPanel } from '../components/analysis/InterviewQuestionsPanel';
import { NotesButton } from '../components/analysis/NotesButton';
import { SecurityReport } from '../components/analysis/SecurityReport';
import ProgressLoader from '../components/common/ProgressLoader';
import AIChat from '../components/analysis/AIChat';
import { LearningResources } from '../components/analysis/LearningResources';
import { DifficultyPanel } from '../components/analysis/DifficultyPanel';

function ErrorState({ message, onRetry }) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Analysis Failed</h2>
      <p className="text-gray-600 mb-6">{message}</p>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={onRetry}
          className="px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold"
        >
          Retry
        </button>
        <Link to="/dashboard" className="px-6 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium">
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}

function ReanalyzeButton({ onReanalyze, loading }) {
  return (
    <button
      onClick={onReanalyze}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50 transition-colors"
    >
      {loading ? (
        <>
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white shrink-0"></div>
          Re-analyzing...
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Re-analyze
        </>
      )}
    </button>
  );
}

function ProcessingBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-3">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 shrink-0"></div>
      <span className="text-blue-700">Analysis is running in the background. Results will appear here once complete.</span>
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const forceAnalysis = searchParams.get('force') === 'true';
  const { data, loading, error, refetch, reanalyzing, reanalyze, reanalyzeError, clearReanalyzeError } = useAnalysis(id, forceAnalysis);

  useEffect(() => {
    if (!loading && data) window.scrollTo(0, 0);
  }, [loading, data]);

  if (loading) return <ProgressLoader projectId={id} />;
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const { project, explanations, dependencyGraph, simplifiedGraph, partial } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{project?.projectName || 'Project Analysis'}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {project?.fileCount} files · {project?.totalLOC} LOC · {project?.detectedTechStack?.join(', ')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ReanalyzeButton onReanalyze={reanalyze} loading={reanalyzing} />
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            ← Dashboard
          </Link>
        </div>
      </div>

      {partial && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm">
          Some analysis sections could not be generated. Results shown are partial.
        </div>
      )}

      {(reanalyzing || data?.processing) && <ProcessingBanner />}

      {reanalyzeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-center justify-between">
          <span>Re-analysis failed: {reanalyzeError}</span>
          <button
            onClick={clearReanalyzeError}
            className="ml-3 text-red-500 hover:text-red-700 font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        <ProjectOverview
          project={project}
          purpose={explanations?.purpose}
        />

        {data.difficulty && <DifficultyPanel difficulty={data.difficulty} />}

        <ArchitectureGraph
          dependencyGraph={dependencyGraph}
          simplifiedGraph={simplifiedGraph}
        />

        <ExplanationCards explanations={explanations} learningResources={data.learningResources} />
        <KnowledgeGraph knowledgeGraph={data.knowledgeGraph} />
        {data.security && <SecurityReport security={data.security} />}
        {data.learningResources && <LearningResources learningResources={data.learningResources} />}
        <InterviewQuestionsPanel projectId={id} />
        <AIChat projectId={id} />
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <NotesButton projectId={id} />
      </div>
    </div>
  );
}
