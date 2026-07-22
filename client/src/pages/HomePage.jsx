import { Link } from 'react-router-dom';
import { useAnimatedValue } from '../hooks/useAnimatedValue';
import { useParallax } from '../hooks/useParallax';
import { useScrollReveal } from '../hooks/useScrollReveal';
import { ScrollReveal, StaggerChildren } from '../components/common/Animations';
import ParticleNetwork from '../components/common/ParticleNetwork';

function AnimatedStat({ end, suffix = '', label, decimals = 0 }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.3 });
  const { value } = useAnimatedValue(end, { duration: 1500, easing: 'easeOutExpo', delay: 200, enabled: isVisible });

  const display = decimals > 0 ? value.toFixed(decimals) : Math.floor(value).toLocaleString();
  return (
    <div ref={ref} className="px-6 py-6 text-center">
      <div className="text-3xl sm:text-4xl font-black text-surface-900 tracking-tight tabular-nums">
        {display}{suffix}
      </div>
      <div className="text-sm text-surface-500 font-medium mt-1">{label}</div>
    </div>
  );
}

function ParallaxBlob({ className }) {
  const { offset } = useParallax(0.15, { maxOffset: 30 });
  return (
    <div
      className={`absolute rounded-3xl blur-sm ${className}`}
      style={{ transform: `translateY(${offset}px)` }}
    />
  );
}

const features = [
  {
    gradient: 'from-indigo-500 via-purple-500 to-indigo-600',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Analysis',
    description: 'DeepSeek AI generates human-readable explanations of your entire codebase — architecture, data flow, purpose, and more.',
    highlights: ['Architecture breakdowns', 'Execution flows', 'Plain-English summaries'],
  },
  {
    gradient: 'from-emerald-500 via-teal-500 to-emerald-600',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    title: 'Interactive Graphs',
    description: 'Explore dependency graphs, call graphs, API flows, and database ER diagrams with zoomable, draggable D3.js visualizations.',
    highlights: ['Dependency & call graphs', 'API flow diagrams', 'Database ER diagrams'],
  },
  {
    gradient: 'from-amber-500 via-orange-500 to-amber-600',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Interview Ready',
    description: 'Get personalized interview questions generated from the actual code, plus skill extraction and resume-ready project highlights.',
    highlights: ['Code-based interview Q&A', 'Skill extraction', 'Resume summaries'],
  },
];

const metrics = [
  { value: 12, suffix: '+', label: 'Languages Supported', decimals: 0 },
  { value: 7, suffix: '', label: 'Interactive Diagrams', decimals: 0 },
  { value: 100, suffix: '%', label: 'AI-Powered Insights', decimals: 0 },
  { value: 3, suffix: '', label: 'Import Methods', decimals: 0 },
];

const trusts = ['React', 'TypeScript', 'Python', 'Java', 'Go', 'Node.js', 'C++', 'PHP', 'C#'];

function FeatureCard({ feature }) {
  return (
    <div className="card-feature group">
      <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} text-white shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-400`}>
        {feature.icon}
      </div>
      <h3 className="text-xl font-bold text-surface-900 mt-6 mb-3">{feature.title}</h3>
      <p className="text-surface-500 leading-relaxed text-sm mb-5">{feature.description}</p>
      <ul className="space-y-2">
        {feature.highlights.map((h) => (
          <li key={h} className="flex items-center gap-2 text-xs font-semibold text-surface-600">
            <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
            {h}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HomePage() {
  const { offset: heroOffset } = useParallax(0.12, { maxOffset: 40 });

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* ──── Hero Section ──── */}
      <section className="relative max-w-7xl mx-auto px-4 pt-12 sm:pt-16 pb-12 sm:pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero rounded-full opacity-50" />
        <ParticleNetwork />

        <ParallaxBlob className="hidden lg:block w-32 h-32 bg-indigo-400/15 top-0 right-[10%] rotate-12" />
        <ParallaxBlob className="hidden lg:block w-24 h-24 bg-violet-400/10 bottom-16 left-[5%] -rotate-12" />
        <ParallaxBlob className="hidden lg:block w-36 h-36 bg-purple-400/10 top-32 right-[5%] rounded-full" />

        <div style={{ transform: `translateY(${heroOffset}px)` }}>
          <div className="relative">
            <ScrollReveal animation="fadeIn" transition="fast">
              <div className="inline-flex items-center gap-2.5 px-4 py-2 bg-white/70 backdrop-blur-sm border border-emerald-200/60 rounded-full text-sm font-semibold text-primary-700 mb-6 shadow-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                AI-Powered Code Understanding · Now with DeepSeek
              </div>
            </ScrollReveal>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-surface-900 mb-5 leading-[1.1] tracking-tight text-balance">
              <ScrollReveal animation="fadeUp" transition="fast">
                Understand any
              </ScrollReveal>
              <br />
              <ScrollReveal animation="fadeUp" transition="fast" delay={80}>
                <span className="text-gradient">codebase instantly</span>
              </ScrollReveal>
            </h1>

            <ScrollReveal animation="fadeUp" transition="fast" delay={100}>
              <p className="text-base sm:text-lg text-surface-500 max-w-2xl mx-auto mb-8 leading-relaxed text-balance">
                Upload a ZIP, paste a URL, or connect GitHub — and get AI-powered architecture
                explanations, interactive diagrams, interview prep, and resume-ready insights
                in minutes.
              </p>
            </ScrollReveal>

            <ScrollReveal animation="fadeUp" transition="fast" delay={150}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/register" className="btn-primary px-10 py-4 text-base sm:text-lg w-full sm:w-auto">
                  Start analyzing free
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link to="/login" className="btn-secondary px-10 py-4 text-base sm:text-lg w-full sm:w-auto">
                  Sign in
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ──── Metrics Bar ──── */}
      <section className="max-w-5xl mx-auto px-4 pb-12 sm:pb-16">
        <div className="glass-panel grid grid-cols-2 md:grid-cols-4 divide-x divide-surface-200/50 overflow-hidden px-2 py-2">
          {metrics.map((m) => (
            <AnimatedStat key={m.label} end={m.value} suffix={m.suffix} label={m.label} decimals={m.decimals} />
          ))}
        </div>
      </section>

      {/* ──── Features (staggered reveal) ──── */}
      <section className="max-w-7xl mx-auto px-4 pb-20 sm:pb-28">
        <ScrollReveal animation="fadeUp" transition="smooth">
          <div className="text-center mb-16 sm:mb-20">
            <span className="text-xs font-bold text-primary-600 uppercase tracking-[0.2em] mb-3 block">Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-surface-900 mb-4 text-balance">
              Everything you need to master any codebase
            </h2>
            <p className="text-surface-500 max-w-xl mx-auto text-balance">
              From architecture analysis to interview prep — LearnSmart gives you the complete picture
              with production-grade tooling.
            </p>
          </div>
        </ScrollReveal>

        <StaggerChildren animation="fadeUp" baseDelay={120} className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f) => (
            <FeatureCard key={f.title} feature={f} />
          ))}
        </StaggerChildren>
      </section>

      {/* ──── Trust Bar ──── */}
      <section className="max-w-5xl mx-auto px-4 pb-20 sm:pb-28">
        <ScrollReveal animation="fadeUp" transition="smooth">
          <p className="text-center text-xs font-bold text-surface-400 uppercase tracking-[0.2em] mb-6">
            Works with any stack
          </p>
        </ScrollReveal>
        <StaggerChildren animation="scaleUp" baseDelay={60} className="flex flex-wrap items-center justify-center gap-3">
          {trusts.map((tech) => (
            <span
              key={tech}
              className="px-5 py-2.5 bg-white/60 backdrop-blur-sm border border-surface-200/60 rounded-2xl text-sm font-semibold text-surface-600 shadow-sm hover:shadow-soft hover:text-surface-800 hover:border-surface-300"
            >
              {tech}
            </span>
          ))}
        </StaggerChildren>
      </section>

      {/* ──── Bottom CTA ──── */}
      <section className="relative max-w-4xl mx-auto px-4 pb-24 sm:pb-32">
        <div className="absolute inset-0 bg-gradient-hero-bottom rounded-full opacity-40" />
        <ScrollReveal animation="scaleUp" transition="spring">
          <div className="relative glass-panel p-10 sm:p-14 text-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-surface-900 mb-4 text-balance">
              Ready to understand your codebase?
            </h2>
            <p className="text-surface-500 mb-8 text-balance max-w-md mx-auto">
              Upload a project and get a complete analysis in minutes. No setup, no config — just results.
            </p>
            <Link to="/register" className="btn-primary px-10 py-4 text-lg inline-flex">
              Get started free
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
