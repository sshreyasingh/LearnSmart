import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAnalysis } from '../hooks/useAnalysis';
import { ProjectOverview } from '../components/analysis/ProjectOverview';
import { ArchitectureGraph } from '../components/analysis/ArchitectureGraph';
import { ExplanationCards } from '../components/analysis/ExplanationCards';
import { KnowledgeGraph } from '../components/analysis/KnowledgeGraph';
import { InterviewQuestionsPanel } from '../components/analysis/InterviewQuestionsPanel';
import { NotesButton } from '../components/analysis/NotesButton';
import { SecurityReport } from '../components/analysis/SecurityReport';
import { MetricsPanel } from '../components/analysis/MetricsPanel';
import SourceReport from '../components/analysis/SourceReport';
import AIChat from '../components/analysis/AIChat';
import { LearningResources } from '../components/analysis/LearningResources';
import { DifficultyPanel } from '../components/analysis/DifficultyPanel';
import { AnalysisSkeleton } from '../components/common/Skeleton';
import { ErrorState } from '../components/common/Feedback';
import { ScrollReveal } from '../components/common/Animations';

function ProcessingBanner({ progress }) {
  return (
    <div className="alert-info mb-6">
      <svg className="animate-spin h-5 w-5 text-blue-600 shrink-0" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span>{progress?.phase || 'Preparing analysis'} ({progress?.current || 0}%). Results appear as they become available.</span>
    </div>
  );
}

export default function AnalysisPage() {
  const { id } = useParams();
  const { data, loading, error, refetch, reanalyzing, reanalyze, reanalyzeError, clearReanalyzeError } = useAnalysis(id);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (loading && !data) return <AnalysisSkeleton />;
  if (error && !data) return <ErrorState message={error} onRetry={() => refetch()} />;
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
            disabled={reanalyzing || loading}
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
          <div>
            <span>Some sections could not be generated. Available results are shown below.</span>
            {data.errors?.length > 0 && <ul className="list-disc pl-5 mt-1">{data.errors.map((item, index) => <li key={index}>{item.message}</li>)}</ul>}
          </div>
        </div>
      )}

      {(reanalyzing || data?.processing) && <ProcessingBanner progress={data.progress} />}

      {reanalyzeError && (
        <div className="alert-error mb-6 justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0 mt-px" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{reanalyzeError}</span>
          </div>
          <button onClick={clearReanalyzeError} className="ml-3 text-red-400 hover:text-red-400 font-medium shrink-0">
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
          <ProjectOverview processing={data.processing} project={project} purpose={explanations?.purpose} />
        </ScrollReveal>
        <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
          <MetricsPanel metrics={data.metrics} />
        </ScrollReveal>
        {data.staticAnalysis && (
          <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
            <SourceReport analysis={data.staticAnalysis} />
          </ScrollReveal>
        )}
        {data.executiveSummary && (
          <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
            <section className="section-card"><h2 className="text-xl font-bold mb-3">Project Summary</h2><p className="whitespace-pre-wrap">{data.executiveSummary}</p></section>
          </ScrollReveal>
        )}
        {data.errorMessage && !data.staticAnalysis && <Link to="/upload" className="btn-secondary">Upload repository again</Link>}
        {data.difficulty && (
          <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
            <DifficultyPanel difficulty={data.difficulty} />
          </ScrollReveal>
        )}
        <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
          <ArchitectureGraph dependencyGraph={dependencyGraph} simplifiedGraph={simplifiedGraph} />
        </ScrollReveal>
        <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
          <ExplanationCards explanations={explanations} learningResources={data.learningResources} />
        </ScrollReveal>
        <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
          <KnowledgeGraph knowledgeGraph={data.knowledgeGraph} />
        </ScrollReveal>
        {data.security && (
          <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
            <SecurityReport security={data.security} />
          </ScrollReveal>
        )}
        {data.learningResources && (
          <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
            <LearningResources learningResources={data.learningResources} />
          </ScrollReveal>
        )}
        {!data.processing && data.staticAnalysis && (
          <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
            <InterviewQuestionsPanel key={data.generatedAt} projectId={id} />
          </ScrollReveal>
        )}
        {!data.processing && data.staticAnalysis && (
          <ScrollReveal animation="fadeUp" transition="fast" threshold={0.05}>
            <AIChat projectId={id} />
          </ScrollReveal>
        )}
      </div>

      <div className="fixed bottom-6 right-6 z-40">
        <NotesButton projectId={id} />
      </div>
    </div>
  );
}
