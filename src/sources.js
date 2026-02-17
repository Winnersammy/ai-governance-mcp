/**
 * AI Governance Data Sources
 * Covers EU, US, OECD, and global frameworks
 */

export const SOURCES = {
  // ─── EU ────────────────────────────────────────────────────────
  eurlex: {
    name: "EUR-Lex (EU Law Database)",
    region: "EU",
    baseUrl: "https://eur-lex.europa.eu",
    searchUrl: "https://eur-lex.europa.eu/search.html",
    // SPARQL endpoint for structured queries
    sparqlUrl: "https://publications.europa.eu/webapi/rdf/sparql",
    rssFeeds: [
      {
        label: "EU AI Act Updates",
        url: "https://eur-lex.europa.eu/legal-content/EN/RSS/?uri=CELEX:32024R1689",
      },
    ],
    keyDocs: [
      {
        id: "32024R1689",
        title: "EU Artificial Intelligence Act (2024)",
        celex: "32024R1689",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689",
        date: "2024-07-12",
        status: "In force",
        type: "Regulation",
      },
      {
        id: "32016R0679",
        title: "General Data Protection Regulation (GDPR)",
        celex: "32016R0679",
        url: "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679",
        date: "2016-04-27",
        status: "In force",
        type: "Regulation",
      },
    ],
  },

  // ─── US ────────────────────────────────────────────────────────
  govinfo: {
    name: "GovInfo (US Government)",
    region: "US",
    baseUrl: "https://api.govinfo.gov",
    // Public API — no key required for basic search
    searchUrl: "https://api.govinfo.gov/search",
    rssFeeds: [
      {
        label: "Federal Register — AI Rules",
        url: "https://www.federalregister.gov/api/v1/articles.rss?conditions[term]=artificial+intelligence&conditions[type][]=RULE&conditions[type][]=PRORULE",
      },
      {
        label: "Federal Register — AI Notices",
        url: "https://www.federalregister.gov/api/v1/articles.rss?conditions[term]=artificial+intelligence&conditions[type][]=NOTICE",
      },
    ],
    keyDocs: [
      {
        id: "EO-14110",
        title: "Executive Order on Safe, Secure, and Trustworthy AI (Biden, 2023)",
        url: "https://www.federalregister.gov/documents/2023/11/01/2023-24283/safe-secure-and-trustworthy-development-and-use-of-artificial-intelligence",
        date: "2023-10-30",
        status: "Revoked (Jan 2025)",
        type: "Executive Order",
      },
      {
        id: "EO-14179",
        title: "Removing Barriers to American Leadership in AI (Trump, 2025)",
        url: "https://www.federalregister.gov/documents/2025/01/23/2025-01953/removing-barriers-to-american-leadership-in-artificial-intelligence",
        date: "2025-01-20",
        status: "Active",
        type: "Executive Order",
      },
      {
        id: "NIST-AI-RMF",
        title: "NIST AI Risk Management Framework 1.0",
        url: "https://airc.nist.gov/RMF",
        date: "2023-01-26",
        status: "Active",
        type: "Framework",
      },
    ],
  },

  // ─── OECD ──────────────────────────────────────────────────────
  oecd: {
    name: "OECD AI Policy Observatory",
    region: "Global",
    baseUrl: "https://oecd.ai",
    policyUrl: "https://oecd.ai/en/wonk/policy-areas",
    rssFeeds: [
      {
        label: "OECD AI News",
        url: "https://oecd.ai/en/feed",
      },
    ],
    keyDocs: [
      {
        id: "OECD-AI-Principles",
        title: "OECD Principles on Artificial Intelligence (2019, updated 2024)",
        url: "https://oecd.ai/en/ai-principles",
        date: "2024-05-03",
        status: "Active",
        type: "Principles",
      },
      {
        id: "G7-Hiroshima-AI-Process",
        title: "G7 Hiroshima AI Process — International Code of Conduct",
        url: "https://www.meti.go.jp/press/2023/10/20231030002/20231030002-1.pdf",
        date: "2023-10-30",
        status: "Active",
        type: "Code of Conduct",
      },
    ],
  },

  // ─── NEWS / MONITORING ─────────────────────────────────────────
  news: {
    name: "AI Governance News Feeds",
    region: "Global",
    rssFeeds: [
      {
        label: "Future of Life Institute",
        url: "https://futureoflife.org/feed/",
      },
      {
        label: "AI Now Institute",
        url: "https://ainowinstitute.org/feed",
      },
      {
        label: "Stanford HAI",
        url: "https://hai.stanford.edu/news/rss.xml",
      },
      {
        label: "Federal Register — AI (all types)",
        url: "https://www.federalregister.gov/api/v1/articles.rss?conditions[term]=artificial+intelligence",
      },
    ],
  },
};

export const ALL_KEY_DOCS = [
  ...SOURCES.eurlex.keyDocs,
  ...SOURCES.govinfo.keyDocs,
  ...SOURCES.oecd.keyDocs,
];

export const ALL_RSS_FEEDS = [
  ...SOURCES.eurlex.rssFeeds,
  ...SOURCES.govinfo.rssFeeds,
  ...SOURCES.oecd.rssFeeds,
  ...SOURCES.news.rssFeeds,
];
