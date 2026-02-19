import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Search, Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopNavbarProps {
  onSearchOpen?: () => void;
}

/* ── Minimal logo shared with footer ── */
export function Logo({
  iconSize = 28,
  textSize = "text-sm",
}: {
  iconSize?: number;
  textSize?: string;
}) {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <div
        className="flex items-center justify-center rounded-lg gradient-hero shadow-md"
        style={{ width: iconSize, height: iconSize }}
      >
        <svg
          width={iconSize * 0.5}
          height={iconSize * 0.5}
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      </div>
      <span className={cn("font-mono font-bold tracking-tight", textSize)}>
        <span className="text-foreground">advertising</span>
        <span className="text-primary-light">protocols</span>
        <span className="text-muted-foreground">.com</span>
      </span>
    </Link>
  );
}

/* ── Primary nav links ── */
const NAV_LINKS = [
  { label: "Protocols", to: "/protocols" },
  { label: "Learn", to: "/learn" },
  { label: "Timeline", to: "/timeline" },
  { label: "Compare", to: "/compare" },
];

/* ── "More" dropdown items ── */
const MORE_LINKS = [
  { label: "Stack Builder", to: "/stack-builder" },
  { label: "Protocol Graph", to: "/protocol-graph" },
  { label: "Glossary", to: "/glossary" },
  { label: "Chronology", to: "/chronology" },
  { label: "About", to: "/about" },
  { label: "Contribute", to: "/contribute" },
];

export function TopNavbar({ onSearchOpen }: TopNavbarProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(to + "/");

  return (
    <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* ── Left: Logo ── */}
        <Logo />

        {/* ── Center: Desktop links ── */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(link.to)
                    ? "bg-primary/10 text-primary-light"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}

          {/* More dropdown */}
          <li className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              onBlur={() => setTimeout(() => setMoreOpen(false), 150)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                "text-muted-foreground hover:text-foreground hover:bg-surface",
              )}
            >
              More
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-border/70 bg-card shadow-xl py-1 z-50">
                {MORE_LINKS.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "block px-4 py-2 text-sm transition-colors",
                      isActive(link.to)
                        ? "text-primary-light bg-primary/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-surface",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}
          </li>
        </ul>

        {/* ── Right: Search + mobile toggle ── */}
        <div className="flex items-center gap-2">
          {onSearchOpen && (
            <button
              onClick={onSearchOpen}
              className="flex items-center gap-2 rounded-lg border border-border/70 bg-surface/60 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              aria-label="Search protocols"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden sm:inline-flex ml-1 rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                /
              </kbd>
            </button>
          )}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile menu ── */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 py-3 space-y-1">
            {[...NAV_LINKS, ...MORE_LINKS].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(link.to)
                    ? "bg-primary/10 text-primary-light"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}
