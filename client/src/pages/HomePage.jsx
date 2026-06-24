import { Link } from 'react-router-dom';

export default function HomePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <section className="max-w-7xl mx-auto px-4 py-24 text-center relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/40 via-transparent to-transparent rounded-full blur-3xl opacity-60" />
        <div className="relative">
          <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6 leading-tight">
            Understand Any Codebase{' '}
            <span className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
              Instantly
            </span>
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload your project ZIP and get AI-powered explanations, architecture breakdowns,
            execution flow diagrams, interview questions, and resume-ready skill summaries.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-3.5 rounded-xl hover:from-primary-700 hover:to-primary-800 font-semibold text-lg shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 transition-all"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="border border-gray-200 text-gray-600 px-8 py-3.5 rounded-xl hover:bg-white hover:border-gray-300 hover:text-gray-900 font-semibold text-lg transition-all shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: '🧠',
              title: 'AI Code Analysis',
              desc: 'DeepSeek AI analyzes your entire codebase and generates easy-to-understand explanations.',
            },
            {
              icon: '🔗',
              title: 'Interactive Diagrams',
              desc: 'Visualize dependencies, API flows, database relationships, and execution paths.',
            },
            {
              icon: '📄',
              title: 'Resume Ready',
              desc: 'Extract skills, generate project highlights, and prepare for technical interviews.',
            },
          ].map((feature) => (
            <div key={feature.title} className="bg-[#C9EDDC] rounded-2xl shadow-sm border border-emerald-200 p-8 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
