function SourceLink({ url, label, icon, verified }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-sm text-surface-500 hover:text-blue-600 transition-colors group"
    >
      <span className="text-base">{icon}</span>
      <span className="group-hover:underline">{label}</span>
      {verified !== undefined && (
        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${verified ? 'bg-emerald-900/20 text-emerald-400' : 'bg-surface-300 text-surface-500'}`}>
          {verified ? '✓ verified' : 'fallback'}
        </span>
      )}
    </a>
  );
}

function ResourceCard({ resource }) {
  const { technology, category, confidence, officialDocs, mdnDocs, githubRepo, youtubeTutorial, keyConcepts, scraped, scrapeDetails } = resource;

  const confidencePct = Math.round((confidence || 0) * 100);
  const confidenceColor = confidencePct >= 90 ? 'bg-emerald-900/150' : confidencePct >= 70 ? 'bg-blue-900/150' : 'bg-yellow-500';

  return (
    <div className="bg-surface-100/80 border border-surface-300 rounded-xl p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-surface-800">{technology}</h3>
            {scraped && (
              <span className="text-xs bg-purple-100 text-purple-400 px-2 py-0.5 rounded-full font-medium">
                live scraped
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-surface-500 uppercase tracking-wide">{category}</span>
            <div className="flex items-center gap-1">
              <div className={`h-1.5 w-1.5 rounded-full ${confidenceColor}`} />
              <span className="text-xs text-surface-500">{confidencePct}% confidence</span>
            </div>
          </div>
        </div>
      </div>

      {scrapeDetails?.githubStars != null && (
        <div className="flex items-center gap-1.5 mb-3 text-sm">
          <span className="text-yellow-500">★</span>
          <span className="text-surface-500 font-semibold">{scrapeDetails.githubStars.toLocaleString()}</span>
          <span className="text-surface-500">stars on GitHub</span>
        </div>
      )}

      <div className="space-y-2 mb-3">
        <SourceLink url={officialDocs} label="Official Documentation" icon="📘" verified={scrapeDetails?.officialDocsVerified} />
        <SourceLink url={mdnDocs} label="MDN Web Docs" icon="📖" verified={scrapeDetails?.mdnVerified} />
        <SourceLink url={githubRepo} label={scrapeDetails?.githubFullName || "GitHub Repository"} icon="🐙" verified={scrapeDetails?.githubStars != null} />
        <SourceLink url={youtubeTutorial} label="YouTube Tutorial" icon="▶️" verified={scrapeDetails?.youtubeVerified} />
        {resource.scrapeDetails?.youtubeTitle && (
          <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5 ml-6">
            <span className="truncate max-w-[180px]" title={resource.scrapeDetails.youtubeTitle}>{resource.scrapeDetails.youtubeTitle}</span>
            {resource.scrapeDetails.youtubeChannel && (
              <>
                <span>·</span>
                <span>{resource.scrapeDetails.youtubeChannel}</span>
              </>
            )}
            {resource.scrapeDetails.youtubeDuration && (
              <>
                <span>·</span>
                <span>{resource.scrapeDetails.youtubeDuration}</span>
              </>
            )}
          </div>
        )}
      </div>

      {keyConcepts?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-surface-300">
          {keyConcepts.map((concept) => (
            <span key={concept} className="text-xs bg-surface-300 text-surface-500 px-2 py-1 rounded-md">
              {concept}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ConceptCloud({ concepts }) {
  if (!concepts || Object.keys(concepts).length === 0) return null;

  const sorted = Object.entries(concepts).sort((a, b) => b[1].length - a[1].length);
  const maxCount = sorted[0]?.[1]?.length || 1;

  return (
    <div className="bg-surface-100/80 border border-surface-300 rounded-xl p-5">
      <h3 className="font-bold text-surface-800 mb-3">Key Concepts</h3>
      <div className="flex flex-wrap gap-2">
        {sorted.slice(0, 20).map(([concept, techs]) => {
          const size = techs.length / maxCount;
          const fontSize = size > 0.8 ? 'text-sm' : size > 0.5 ? 'text-xs' : 'text-[11px]';
          const opacity = 0.5 + size * 0.5;
          return (
            <span
              key={concept}
              className={`${fontSize} bg-blue-900/15 text-blue-400 px-2.5 py-1 rounded-full cursor-default`}
              style={{ opacity }}
              title={`Used in: ${techs.join(', ')}`}
            >
              {concept}
              <span className="ml-1 text-blue-400 font-medium">{techs.length}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function LearningResources({ learningResources }) {
  if (!learningResources || !learningResources.resources?.length) return null;

  const { resources, concepts, totalResources, scrapedCount, scraperErrors } = learningResources;

  return (
    <div className="bg-surface-200 rounded-2xl shadow-sm border border-surface-300 p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-surface-800">Learning Resources</h2>
        <div className="flex items-center gap-2">
          {scrapedCount > 0 && (
            <span className="text-xs bg-purple-100 text-purple-400 px-2.5 py-1 rounded-full font-medium">
              {scrapedCount} live-scraped
            </span>
          )}
          <span className="text-xs text-surface-500">{totalResources} resources</span>
        </div>
      </div>
      <p className="text-sm text-surface-500 mb-5">
        Official documentation, community resources, and tutorials to help you understand the technologies used in this project.
      </p>

      {scraperErrors?.length > 0 && (
        <div className="bg-amber-900/15 border border-amber-500/20 text-amber-400 px-3 py-2 rounded-lg mb-4 text-xs">
          Some resources couldn't be verified live — using cached fallback links.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {resources.map((resource) => (
          <ResourceCard key={resource.technology} resource={resource} />
        ))}
      </div>

      <ConceptCloud concepts={concepts} />
    </div>
  );
}
