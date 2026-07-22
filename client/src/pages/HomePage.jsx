import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'AI Code Analysis',
    desc: 'DeepSeek AI analyzes your entire codebase and generates easy-to-understand explanations, architecture breakdowns, and execution flows.',
    gradient: 'from-indigo-500 to-purple-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
      </svg>
    ),
    title: 'Interactive Diagrams',
    desc: 'Visualize dependencies, API flows, database relationships, and execution paths with interactive D3.js graphs and Mermaid diagrams.',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Resume Ready',
    desc: 'Extract skills, generate project highlights, get interview questions based on the actual code, and prepare for technical interviews.',
    gradient: 'from-amber-500 to-orange-600',
  },
];

function FeatureCard({ icon, title, desc, gradient }) {
  return (
    <div className="relative group">
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-xl -z-10" />
      <div className="card-elevated p-8 h-full hover:-translate-y-1 transition-transform duration-300 group">
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} text-white mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
        <h3 className="text-xl font-bold text-surface-900 mb-3">{title}</h3>
        <p className="text-surface-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="relative max-w-7xl mx-auto px-4 pt-24 pb-20 text-center">
        <div className="absolute inset-0 bg-gradient-hero rounded-full opacity-60" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 border border-emerald-200 rounded-full text-sm font-medium text-primary-700 mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            AI-Powered Code Understanding
          </div>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-surface-900 mb-6 leading-tight tracking-tight animate-fade-in-up">
            Understand Any Codebase{' '}
            <span className="bg-gradient-to-r from-primary-600 via-accent-500 to-primary-600 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>
          <p className="text-lg md:text-xl text-surface-500 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up">
            Upload your project and get AI-powered explanations, architecture breakdowns,
            execution flow diagrams, interview questions, and resume-ready skill summaries.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in-up">
            <Link to="/register" className="btn-primary px-10 py-4 text-lg">
              Get Started Free
            </Link>
            <Link to="/login" className="btn-secondary px-10 py-4 text-lg">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-surface-900 mb-3">Everything you need to master any codebase</h2>
          <p className="text-surface-500 max-w-xl mx-auto">
            From architecture analysis to interview prep — LearnSmart gives you the complete picture.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>
    </div>
  );
}
