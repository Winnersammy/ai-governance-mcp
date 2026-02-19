import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, BookOpen, Zap, Play, Shield, Fingerprint,
  Smartphone, BarChart2, Tag, Bot, Link as LinkIcon,
  CheckCircle, TrendingUp, Clock, Github,
  ExternalLink, Layers,
} from "lucide-react";
import { protocols, protocolCategories } from "@/data/protocols";
import { TopNavbar, Logo } from "@/components/TopNavbar";
import { EcosystemMap } from "@/components/EcosystemMap";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useTypewriter } from "@/hooks/use-typewriter";
import { cn } from "@/lib/utils";

interface IndexProps {
  onSearchOpen?: () => void;
}

const CAT_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  programmatic: Zap,
  video: Play,
  "supply-chain": LinkIcon,
  privacy: Shield,
  identity: Fingerprint,
  mobile: Smartphone,
  "header-bidding": BarChart2,
  taxonomy: Tag,
  agentic: Bot,
};

const CAT_GLOW: Record<string, string> = {
  programmatic: "var(--cat-openrtb)",
  video: "var(--cat-vast)",
  "supply-chain": "var(--cat-creative)",
  privacy: "var(--cat-iab)",
  identity: "var(--cat-native)",
  mobile: "var(--cat-vast)",
  "header-bidding": "var(--cat-openrtb)",
  taxonomy: "var(--cat-creative)",
  agentic: "var(--cat-native)",
};

const POPULAR_STARTS = [
  { title: "What is OpenRTB?", slug: "openrtb-2", desc: "Backbone of programmatic advertising", emoji: "⚡" },
  { title: "What is VAST?", slug: "vast", desc: "How video ads are served & tracked", emoji: "🎬" },
  { title: "What is TCF / GPP?", slug: "tcf", desc: "Consent frameworks for GDPR & beyond", emoji: "🛡️" },
  { title: "What is Prebid?", slug: "prebid-js", desc: "Open-source header bidding library", emoji: "🏷️" },
];

const stats = [
  { label: "Protocols Documented", value: `${protocols.length}`, icon: BookOpen },
  { label: "Active Standards", value: `${protocols.filter(p => p.status === "active").length}`, icon: CheckCircle },
  { label: "Categories", value: `${protocolCategories.length}`, icon: Tag },
  { label: "Emerging / Draft", value: `${protocols.filter(p => p.status === "emerging" || p.status === "draft").length}`, icon: TrendingUp },
];

const FOOTER_LINKS = {
  Protocols: [
    { label: "All Protocols", to: "/protocols" },
    { label: "OpenRTB", to: "/protocols/openrtb-2" },
    { label: "VAST", to: "/protocols/vast" },
    { label: "Prebid.js", to: "/protocols/prebid-js" },
    { label: "TCF / GPP", to: "/protocols/tcf" },
    { label: "Chronology", to: "/chronology" },
  ],
  Resources: [
    { label: "Learn Ad Tech", to: "/learn" },
    { label: "Compare Protocols", to: "/compare" },
    { label: "Glossary", to: "/glossary" },
    { label: "Timeline", to: "/timeline" },
    { label: "About", to: "/about" },
    { label: "Contribute", to: "/contribute" },
  ],
  Community: [
    { label: "IAB Tech Lab", href: "https://iabtechlab.com" },
    { label: "Prebid.org", href: "https://prebid.org" },
    { label: "Scope3", href: "https://scope3.com" },
    { label: "The Trade Desk", href: "https://www.thetradedesk.com" },
    { label: "GitHub Repository", href: "https://github.com/Samrajtheailyceum" },
  ],
};

const KEY_COMPANIES = [
  { name: "Google", role: "Privacy Sandbox, DV360, Ad Manager", emoji: "🔵" },
  { name: "The Trade Desk", role: "UID2, DSP", emoji: "🎯" },
  { name: "IAB Tech Lab", role: "OpenRTB, VAST, TCF, MRAID, SIMID", emoji: "🏛️" },
  { name: "Prebid.org", role: "Prebid.js, header bidding", emoji: "🏷️" },
  { name: "PubMatic", role: "SSP, AgenticOS", emoji: "🟠" },
  { name: "Magnite", role: "SSP, CTV", emoji: "🔴" },
  { name: "Xandr", role: "Ad Exchange, DSP", emoji: "🟣" },
  { name: "Scope3", role: "Ad Context Protocol, carbon data", emoji: "🌿" },
  { name: "LiveRamp", role: "RampID, data connectivity", emoji: "🪢" },
  { name: "ID5", role: "Shared identity graph", emoji: "🪪" },
  { name: "DoubleVerify", role: "Viewability, brand safety", emoji: "✅" },
  { name: "Integral Ad Science", role: "Verification, attention", emoji: "🔍" },
  { name: "Apple", role: "SKAdNetwork, AdAttributionKit", emoji: "🍎" },
  { name: "Chalice", role: "Contextual targeting", emoji: "⚗️" },
  { name: "Lotame", role: "Data solutions, Panorama ID", emoji: "📊" },
  { name: "AdMesh", role: "Agentic Intent Protocol (AIP)", emoji: "🤖" },
];

export default function Index({ onSearchOpen }: IndexProps) {
  const heroReveal = useScrollReveal({ threshold: 0.05 });
  const popularReveal = useScrollReveal({ threshold: 0.1 });
  const catReveal = useScrollReveal({ threshold: 0.08 });
  const ecoReveal = useScrollReveal({ threshold: 0.06 });
  const companiesReveal = useScrollReveal({ threshold: 0.08 });

  const FULL_TEXT = "advertisingprotocols.com";
  const tw = useTypewriter({ text: FULL_TEXT, speed: 48, startDelay: 200 });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNavbar onSearchOpen={onSearchOpen} />

      {/* ================================================================
          HERO — tightened, fewer visual layers
          ================================================================ */}
      <section className="relative overflow-hidden" ref={heroReveal.ref as React.RefObject<HTMLElement>}>
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/3 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />

        <div className="relative mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2.5 rounded-full border border-border/70 bg-surface/80 px-4 py-1.5 text-sm font-medium text-muted-foreground backdrop-blur shadow-sm">
            <span className="h-2 w-2 rounded-full bg-green pulse-dot" />
            Covering {protocols.length} ad tech standards
          </div>

          <h1 className="mb-6 font-extrabold tracking-tight leading-none">
            <span className="block text-5xl sm:text-6xl lg:text-7xl text-foreground mb-2">
              Every Ad Protocol.
            </span>
            <span className="block text-5xl sm:text-6xl lg:text-7xl gradient-text">
              One Directory.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg sm:text-xl text-muted-foreground leading-relaxed">
            From OpenRTB to SKAdNetwork, from TCF to ARTF. Every standard, explained for both beginners and experts.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/learn"
              className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-base font-bold text-primary-foreground gradient-hero shadow-lg shadow-primary/30 hover:opacity-90 hover:shadow-xl hover:shadow-primary/40 transition-all duration-200"
            >
              I'm New: Start Here
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/protocols"
              className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-surface/60 backdrop-blur px-7 py-3.5 text-base font-bold text-foreground hover:border-primary/50 hover:bg-surface transition-all duration-200"
            >
              Browse All Protocols
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          STATS BAR
          ================================================================ */}
      <section className="border-y border-border/60 bg-surface/50">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-extrabold gradient-text tabular-nums">{stat.value}</div>
                <div className="mt-1 text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          POPULAR STARTING POINTS
          ================================================================ */}
      <section
        ref={popularReveal.ref as React.RefObject<HTMLElement>}
        className={cn(
          "mx-auto max-w-5xl px-6 py-20 transition-all duration-700",
          popularReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-extrabold text-foreground mb-2">Popular Starting Points</h2>
          <p className="text-muted-foreground text-sm">New to ad tech? These are the foundational standards to learn first.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_STARTS.map((item) => (
            <Link
              key={item.slug}
              to={`/protocols/${item.slug}`}
              className="group rounded-xl border border-border/70 bg-card p-5 card-hover"
            >
              <div className="text-3xl mb-3">{item.emoji}</div>
              <h3 className="font-bold text-foreground group-hover:text-primary-light transition-colors mb-1 text-sm">
                {item.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ================================================================
          CATEGORY CARDS
          ================================================================ */}
      <section
        ref={catReveal.ref as React.RefObject<HTMLElement>}
        className={cn(
          "border-t border-border/60 bg-surface/30 transition-all duration-700",
          catReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-extrabold text-foreground mb-3">Browse by Category</h2>
            <p className="text-muted-foreground">Jump directly to the protocol group you need.</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {protocolCategories.map((cat) => {
              const Icon = CAT_ICON_MAP[cat.id] ?? BookOpen;
              const glowColor = CAT_GLOW[cat.id] ?? "var(--primary)";
              return (
                <Link
                  key={cat.id}
                  to={`/protocols?category=${cat.id}`}
                  className="group relative overflow-hidden rounded-xl border border-border/70 bg-card p-6 card-hover"
                >
                  <div
                    className="absolute -top-10 -right-10 h-28 w-28 rounded-full blur-2xl opacity-20 group-hover:opacity-35 transition-opacity"
                    style={{ backgroundColor: `hsl(${glowColor})` }}
                  />
                  <div className="relative">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl gradient-hero shadow-md">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="mb-1.5 text-base font-bold text-foreground group-hover:text-primary-light transition-colors">
                      {cat.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">{cat.description}</p>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {cat.protocols.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className="rounded-full border border-primary/20 bg-primary/8 text-primary-light px-2 py-0.5 text-xs font-medium"
                          style={{ backgroundColor: "hsl(var(--primary)/0.08)" }}
                        >
                          {p.shortTitle ?? p.title}
                        </span>
                      ))}
                      {cat.protocols.length > 3 && (
                        <span className="rounded-full border border-border bg-muted text-muted-foreground px-2 py-0.5 text-xs">
                          +{cat.protocols.length - 3}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-primary-light group-hover:gap-2 transition-all">
                      View {cat.protocols.length} protocols
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          TIMELINE + TOOLS TEASER — combined into a single compact row
          ================================================================ */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="grid gap-6 sm:grid-cols-2">
            <Link
              to="/timeline"
              className="group rounded-xl border border-border/70 bg-card p-8 card-hover text-center"
            >
              <Clock className="h-8 w-8 mx-auto mb-4 text-primary-light" />
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary-light transition-colors">
                Ad Tech Timeline
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                From waterfall to agentic AI — see how standards evolved from manual insertion orders to AI-driven bidding.
              </p>
            </Link>
            <Link
              to="/protocol-graph"
              className="group rounded-xl border border-border/70 bg-card p-8 card-hover text-center"
            >
              <Layers className="h-8 w-8 mx-auto mb-4 text-primary-light" />
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary-light transition-colors">
                Protocol Dependency Graph
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Explore how protocols connect and depend on each other in an interactive visual graph.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ================================================================
          ECOSYSTEM MAP
          ================================================================ */}
      <section
        ref={ecoReveal.ref as React.RefObject<HTMLElement>}
        className={cn(
          "border-t border-border/60 bg-surface/20 transition-all duration-700",
          ecoReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <div className="mx-auto max-w-3xl px-6 py-20">
          <div className="text-center mb-10">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground mb-4">
              How the <span className="gradient-text">Ad Ecosystem</span> Works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Every ad impression touches at least five systems in under 200ms. This is who's involved, what they do, and which protocols power each layer.
            </p>
          </div>
          <EcosystemMap />
        </div>
      </section>

      {/* ================================================================
          KEY COMPANIES
          ================================================================ */}
      <section
        ref={companiesReveal.ref as React.RefObject<HTMLElement>}
        className={cn(
          "border-t border-border/60 bg-background transition-all duration-700",
          companiesReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
        )}
      >
        <div className="mx-auto max-w-5xl px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-extrabold text-foreground mb-2">Companies Referenced</h2>
            <p className="text-sm text-muted-foreground">
              {KEY_COMPANIES.length} organisations whose protocols, products, or standards are documented here.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {KEY_COMPANIES.map((co) => (
              <div
                key={co.name}
                className="rounded-xl border border-border/70 bg-card p-4 flex items-start gap-3"
              >
                <span className="text-xl shrink-0">{co.emoji}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{co.name}</p>
                  <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{co.role}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            Not affiliated with any of these organisations. Logos and names are property of their respective owners.
          </p>
        </div>
      </section>

      {/* ================================================================
          FOOTER
          ================================================================ */}
      <footer className="border-t border-border/60 bg-surface/40">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 mb-12">
            <div className="lg:col-span-1">
              <Logo iconSize={36} textSize="text-sm" />
              <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                Community reference for advertising industry standards. Covering every major protocol, explained for humans.
              </p>
              <a
                href="https://github.com/Samrajtheailyceum"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary-light transition-colors"
              >
                <Github className="h-4 w-4" />
                GitHub Repository
              </a>
            </div>
            {Object.entries(FOOTER_LINKS).map(([group, links]) => (
              <div key={group}>
                <h4 className="mb-4 text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                  {group}
                </h4>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      {"to" in link ? (
                        <Link
                          to={link.to}
                          className="text-sm text-muted-foreground hover:text-primary-light transition-colors"
                        >
                          {link.label}
                        </Link>
                      ) : (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary-light transition-colors"
                        >
                          {link.label}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border border-border/50 rounded-xl bg-muted/30 px-5 py-4 mb-6 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Note:</span> This is a community reference and may be subject to errors or gaps. Ad tech specs evolve quickly. If you spot something wrong,{" "}
            <Link to="/contribute" className="text-primary-light hover:underline">contributions are welcome</Link>.
          </div>
          <div className="border-t border-border/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground/60">
              © {new Date().getFullYear()} advertisingprotocols.com · Not affiliated with IAB Tech Lab.
            </p>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground/60">
              <Link to="/privacy" className="text-primary-light hover:underline">Privacy</Link>
              <Link to="/terms" className="text-primary-light hover:underline">Terms</Link>
              <span>Created by{" "}
                <a href="https://www.linkedin.com/in/samrajmatharu/" target="_blank" rel="noopener noreferrer" className="text-primary-light hover:underline">
                  Samraj Matharu
                </a>
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
