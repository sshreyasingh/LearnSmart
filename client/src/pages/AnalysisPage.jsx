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
import { AnalysisSkeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/Feedback';

function ProcessingBanner() {
  return (
    <div className="alert-info mb-6">
      <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>Analysis is running in the background. Results will appear here once complete.</span>
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

  if (loading) return <AnalysisSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={refetch} />;
  if (!data) return null;

  const { project, explanations, dependencyGraph, simplifiedGraph, partial } = data;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-surface-900 tracking-tight">{project?.projectName || 'Project Analysis'}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-surface-500">
            <span>{project?.fileCount} files</span>
            <span className="text-surface-300">·</span>
            <span>{project?.totalLOC?.toLocaleString()} LOC</span>
            {project?.detectedTechStack?.length > 0 && (
              <>
                <span className="text-surface-300">·</span>
                <span>{project.detectedTechStack.join(', ')}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={reanalyze}
            disabled={reanalyzing}
            className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
          >
            {reanalyzing ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Re-analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Re-analyze
              </>
            )}
          </button>
          <Link to="/dashboard" className="btn-ghost px-4 py-2 text-sm">
            ← Dashboard
          </Link>
        </div>
      </div>

      {partial && (
        <div className="alert-warning mb-6">
          <svg className="w-5 h-5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L4.08 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Some analysis sections could not be generated. Results shown are partial.</span>
        </div>
      )}

      {(reanalyzing || data?.processing) && <ProcessingBanner />}

      {reanalyzeError && (
        <div className="alert-error mb-6 justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Re-analysis failed: {reanalyzeError}</span>
          </div>
          <button onClick={clearReanalyzeError} className="ml-3 text-red-500 hover:text-red-700 font-medium shrink-0">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        <ProjectOverview project={project} purpose={explanations?.purpose} />
        {data.difficulty && <DifficultyPanel difficulty={data.difficulty} />}
        <ArchitectureGraph dependencyGraph={dependencyGraph} simplifiedGraph={simplifiedGraph} />
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
