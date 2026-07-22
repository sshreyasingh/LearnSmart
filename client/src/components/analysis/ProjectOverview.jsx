function AboutSection({ data }) {
  const hasAiContent = data.whatItDoes || data.problemSolved || data.targetAudience || data.keyFeatures?.length > 0;

  if (!hasAiContent) {
    return (
      <div className="flex items-center gap-3 py-4">
        <svg className="animate-spin h-4 w-4 text-primary-400" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-surface-500">AI is analyzing the project to understand its purpose and features...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-2">Description</h3>
        <p className="text-surface-700 leading-relaxed">{data.whatItDoes}</p>
      </div>

      {data.keyFeatures?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">Key Features</h3>
          <ul className="space-y-2">
            {data.keyFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-surface-600">
                <span className="w-5 h-5 bg-primary-500/15 text-primary-400 rounded-md flex items-center justify-center shrink-0 mt-px">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.problemSolved && (
          <div className="bg-surface-100/70 rounded-xl p-4 border border-surface-100">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1">Problem Solved</h4>
            <p className="text-sm text-surface-700">{data.problemSolved}</p>
          </div>
        )}
        {data.targetAudience && (
          <div className="bg-surface-100/70 rounded-xl p-4 border border-surface-100">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1">Target Audience</h4>
            <p className="text-sm text-surface-700">{data.targetAudience}</p>
          </div>
        )}
        {data.primaryUseCase && (
          <div className="bg-surface-100/70 rounded-xl p-4 border border-surface-100">
            <h4 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-1">Primary Use Case</h4>
            <p className="text-sm text-surface-700">{data.primaryUseCase}</p>
          </div>
        )}
      </div>

      {data.uniqueValue && (
        <div className="p-4 bg-amber-900/15 border border-amber-500/20 rounded-xl">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">Unique Value</h3>
          <p className="text-sm text-amber-400">{data.uniqueValue}</p>
        </div>
      )}
    </div>
  );
}

export function ProjectOverview({ project, purpose }) {
  const techStack = project?.detectedTechStack || [];
  const data = purpose || {};

  return (
    <div className="section-card">
      <h2 className="text-xl font-bold text-surface-900 mb-5">
        About {data.title || project?.projectName || 'This Project'}
      </h2>

      <AboutSection data={data} />

      <div className="mt-6 pt-6 border-t border-surface-300/60">
        <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-4">Project Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface-100/70 rounded-xl p-4 text-center border border-surface-100">
            <div className="text-2xl font-bold text-primary-400">{project?.fileCount || 0}</div>
            <div className="text-xs text-surface-400 mt-1 font-medium">Files</div>
          </div>
          <div className="bg-surface-100/70 rounded-xl p-4 text-center border border-surface-100">
            <div className="text-2xl font-bold text-primary-400">
              {project?.totalLOC >= 1000
                ? `${(project.totalLOC / 1000).toFixed(1)}K`
                : project?.totalLOC || 0}
            </div>
            <div className="text-xs text-surface-400 mt-1 font-medium">Lines of Code</div>
          </div>
          <div className="bg-surface-100/70 rounded-xl p-4 text-center border border-surface-100">
            <div className="text-2xl font-bold text-primary-400">
              {project?.totalSizeKB >= 1024
                ? `${(project.totalSizeKB / 1024).toFixed(1)}MB`
                : `${project?.totalSizeKB || 0}KB`}
            </div>
            <div className="text-xs text-surface-400 mt-1 font-medium">Size</div>
          </div>
          <div className="bg-surface-100/70 rounded-xl p-4 text-center border border-surface-100">
            <div className="text-xl font-bold text-primary-400 truncate capitalize">
              {project?.status?.replace('_', ' ') || 'Unknown'}
            </div>
            <div className="text-xs text-surface-400 mt-1 font-medium">Status</div>
          </div>
        </div>
      </div>

      {techStack.length > 0 && (
        <div className="mt-6 pt-6 border-t border-surface-300/60">
          <h3 className="text-xs font-bold text-surface-500 uppercase tracking-widest mb-3">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1.5 bg-primary-500/10 text-primary-400 rounded-lg text-xs font-semibold border border-primary-500/20"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
