import Link from 'next/link';
import { Rocket, Brain, Globe, Zap, Phone, Shield, ArrowRight, Sparkles, Bot, Layers } from 'lucide-react';

export const metadata = {
  title: 'Full Send AI | Autonomous AI Agents That Get Things Done',
  description: 'AI agents that autonomously execute tasks, research the web, create content, make phone calls, and connect to 3000+ apps. Your personal AI workforce.',
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#faf8f5]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#faf8f5]/80 backdrop-blur-xl border-b border-[#e5e0d8]/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#2d8a4e] flex items-center justify-center shadow-md shadow-[#2d8a4e]/20">
                <Rocket className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold text-[#1a1a1a]">Full Send AI</span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-sm font-medium text-[#8a8478] hover:text-[#1a1a1a] transition-colors px-3 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="text-sm font-semibold bg-[#2d8a4e] text-white px-4 py-2 rounded-lg hover:bg-[#247a42] transition-colors shadow-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e8f5ec] text-[#2d8a4e] text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Autonomous AI agents that work for you
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1a1a1a] leading-tight mb-6">
            Your AI agents.
            <br />
            <span className="text-[#2d8a4e]">Fully autonomous.</span>
          </h1>
          <p className="text-lg sm:text-xl text-[#8a8478] max-w-2xl mx-auto mb-10 leading-relaxed">
            Full Send AI deploys intelligent agents that research, create, call, code, and connect to 3,000+ apps. Tell them what to do and they handle the rest.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#2d8a4e] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#247a42] transition-all shadow-lg shadow-[#2d8a4e]/20 text-base"
            >
              Start Building
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white text-[#1a1a1a] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#f5f2ed] transition-all border border-[#e5e0d8] text-base"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white border-y border-[#e5e0d8]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-4">
              Everything your agents can do
            </h2>
            <p className="text-lg text-[#8a8478] max-w-xl mx-auto">
              Powerful capabilities that let your AI agents handle complex workflows end to end.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Brain className="w-6 h-6" />}
              title="Deep Research"
              description="Agents search the web, analyze sources, and synthesize findings into actionable insights."
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Browse the Web"
              description="Cloud browser automation that navigates, extracts data, and interacts with any website."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="3,000+ App Connections"
              description="Connect to Slack, Gmail, Notion, Salesforce, and thousands more via Pipedream."
            />
            <FeatureCard
              icon={<Phone className="w-6 h-6" />}
              title="Phone Calls"
              description="AI voice agents that make real phone calls with natural-sounding speech."
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="Autonomous Tasks"
              description="Set up multi-step tasks that run in the background, self-correct, and notify you when done."
            />
            <FeatureCard
              icon={<Layers className="w-6 h-6" />}
              title="Content Creation"
              description="Generate documents, images, code, social posts, and more with AI-powered tools."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#1a1a1a] mb-4">
              How it works
            </h2>
            <p className="text-lg text-[#8a8478]">Three steps to your autonomous AI workforce.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StepCard
              number="1"
              title="Tell your agent"
              description="Describe what you need in plain language. Research a topic, draft content, make calls, or automate workflows."
            />
            <StepCard
              number="2"
              title="Agent executes"
              description="Your agent plans the approach, uses the right tools, browses the web, and handles multi-step tasks autonomously."
            />
            <StepCard
              number="3"
              title="Get results"
              description="Receive polished results, documents, and notifications. Review, refine, and deploy with confidence."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#2d8a4e]">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 mb-6">
            <Rocket className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Ready to go full send?
          </h2>
          <p className="text-lg text-white/80 mb-8 max-w-lg mx-auto">
            Join and let autonomous AI agents handle the work. Research, create, connect, and automate with zero effort.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-white text-[#2d8a4e] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#f5f2ed] transition-all text-base shadow-lg"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t border-[#e5e0d8]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2d8a4e] flex items-center justify-center">
              <span className="text-white text-xs font-bold">F</span>
            </div>
            <span className="text-sm font-semibold text-[#1a1a1a]">Full Send AI</span>
          </div>
          <p className="text-sm text-[#8a8478]">
            &copy; {new Date().getFullYear()} Full Send AI. All rights reserved.
          </p>
        </div>
      </footer>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Full Send AI",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web",
            "description": "Autonomous AI agents that execute tasks, research the web, create content, make phone calls, and connect to 3000+ apps.",
            "url": "https://fullsendai.com",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD"
            },
            "creator": {
              "@type": "Organization",
              "name": "Full Send AI"
            }
          })
        }}
      />
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-[#faf8f5] border border-[#e5e0d8] hover:border-[#2d8a4e]/30 hover:shadow-md transition-all">
      <div className="w-12 h-12 rounded-xl bg-[#e8f5ec] flex items-center justify-center text-[#2d8a4e] mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">{title}</h3>
      <p className="text-sm text-[#8a8478] leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-12 h-12 rounded-full bg-[#2d8a4e] text-white text-lg font-bold flex items-center justify-center mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold text-[#1a1a1a] mb-2">{title}</h3>
      <p className="text-sm text-[#8a8478] leading-relaxed">{description}</p>
    </div>
  );
}
