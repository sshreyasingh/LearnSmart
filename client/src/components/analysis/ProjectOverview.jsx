function AboutSection({ data, project }) {
  const hasAiContent = data.whatItDoes || data.problemSolved || data.targetAudience || data.keyFeatures?.length > 0;

  if (!hasAiContent) {
    return (
      <div className="flex items-center gap-3 py-4">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600 shrink-0"></div>
        <p className="text-sm text-gray-500">AI is analyzing the project to understand its purpose and features...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Description */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-1">Description</h3>
        <p className="text-gray-700">{data.whatItDoes}</p>
      </div>

      {/* Key Features */}
      {data.keyFeatures?.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Key Features</h3>
          <ul className="space-y-1.5">
            {data.keyFeatures.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <span className="text-primary-500 mt-0.5 shrink-0">▸</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Info Grid: Problem / Audience / Use Case */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.problemSolved && (
          <div className="bg-white/60 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Problem Solved</h4>
            <p className="text-sm text-gray-700">{data.problemSolved}</p>
          </div>
        )}
        {data.targetAudience && (
          <div className="bg-white/60 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Target Audience</h4>
            <p className="text-sm text-gray-700">{data.targetAudience}</p>
          </div>
        )}
        {data.primaryUseCase && (
          <div className="bg-white/60 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Primary Use Case</h4>
            <p className="text-sm text-gray-700">{data.primaryUseCase}</p>
          </div>
        )}
      </div>

      {/* Unique Value */}
      {data.uniqueValue && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <h3 className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">Unique Value</h3>
          <p className="text-sm text-amber-700">{data.uniqueValue}</p>
        </div>
      )}
    </div>
  );
}

export function ProjectOverview({ project, purpose }) {
  const techStack = project?.detectedTechStack || [];
  const data = purpose || {};

  return (
    <div className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">
        About {data.title || project?.projectName || 'This Project'}
      </h2>

      <AboutSection data={data} project={project} />

      {/* Stats Grid */}
      <div className="mt-6 pt-6 border-t border-emerald-200/60">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Project Stats</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/60 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">{project?.fileCount || 0}</div>
            <div className="text-xs text-gray-500 mt-1">Files</div>
          </div>
          <div className="bg-white/60 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">
              {project?.totalLOC >= 1000
                ? `${(project.totalLOC / 1000).toFixed(1)}K`
                : project?.totalLOC || 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">Lines of Code</div>
          </div>
          <div className="bg-white/60 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-primary-600">
              {project?.totalSizeKB >= 1024
                ? `${(project.totalSizeKB / 1024).toFixed(1)}MB`
                : `${project?.totalSizeKB || 0}KB`}
            </div>
            <div className="text-xs text-gray-500 mt-1">Size</div>
          </div>
          <div className="bg-white/60 rounded-lg p-4 text-center">
            <div className="text-xl font-bold text-primary-600 truncate capitalize">
              {project?.status?.replace('_', ' ') || 'Unknown'}
            </div>
            <div className="text-xs text-gray-500 mt-1">Status</div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      {techStack.length > 0 && (
        <div className="mt-6 pt-6 border-t border-emerald-200/60">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Tech Stack</h3>
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium border border-primary-200"
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
