import axios from "axios";
import * as cheerio from "cheerio";
import RSSParser from "rss-parser";
import { SOURCES, ALL_RSS_FEEDS, ALL_KEY_DOCS } from "./sources.js";
import { LRUCache } from "./cache.js";

const rssParser = new RSSParser({
  timeout: 10000,
  headers: { "User-Agent": "AI-Governance-MCP/2.0" },
});

const http = axios.create({
  timeout: 15000,
  headers: { "User-Agent": "AI-Governance-MCP/2.0" },
});

const CACHE_TTL = 30 * 60 * 1000;
const cache = new LRUCache(500, CACHE_TTL);
const SUMMARY_LIMIT = 180;

const COUNTRY_REGION_MAP = {
  eu: "EU",
  "european union": "EU",
  germany: "EU",
  france: "EU",
  italy: "EU",
  spain: "EU",
  netherlands: "EU",
  us: "US",
  usa: "US",
  "united states": "US",
  america: "US",
  uk: "Global",
  "united kingdom": "Global",
  england: "Global",
  brazil: "Global",
  canada: "Global",
  japan: "Global",
  singapore: "Global",
};

const FRAMEWORK_RULES = [
  {
    match: /hiring|recruit|employment|hr|candidate/i,
    controls: [
      "Classify the system as high-impact employment use and perform pre-deployment risk assessment.",
      "Implement human review for adverse decisions and maintain appeal/escalation procedures.",
      "Document training data representativeness and monitor bias outcomes by protected attributes.",
    ],
  },
  {
    match: /health|medical|clinical|hospital|patient/i,
    controls: [
      "Define clinical safety boundaries, contraindications, and intended-use limitations.",
      "Run validation on representative clinical populations and track post-deployment drift.",
      "Establish incident reporting workflow for safety events and model rollback criteria.",
    ],
  },
  {
    match: /bank|finance|financial|credit|lending|insurance/i,
    controls: [
      "Apply model risk governance with approval gates, challenger testing, and periodic validation.",
      "Enforce explainability controls for customer-impacting decisions and adverse action notices.",
      "Maintain fraud, abuse, and prompt-injection monitoring with security escalation playbooks.",
    ],
  },
  {
    match: /sustain|climate|esg|disclosure|emission|reporting/i,
    controls: [
      "Set traceable evidence links from AI outputs to source data used in sustainability disclosures.",
      "Document governance sign-off for reported metrics and ensure reproducible calculation lineage.",
      "Add controls for greenwashing risk with claim substantiation and legal/compliance review.",
    ],
  },
  {
    match: /chatbot|customer service|support bot|assistant/i,
    controls: [
      "Disclose bot identity and provide an easy path to a human support channel.",
      "Filter unsafe content and enforce response policies for sensitive requests.",
      "Track hallucination and complaint rates, then retrain/restrict intents accordingly.",
    ],
  },
];

function getCached(key) {
  return cache.get(key);
}
function setCached(key, data) {
  cache.set(key, data);
}

function compactSummary(text = "", limit = SUMMARY_LIMIT) {
  return text.replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeUrl(url = "") {
  return url.split("?")[0].replace(/\/$/, "");
}

function dedupeByUrl(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item.url) return false;
    const normalized = normalizeUrl(item.url);
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function tokenizeQuery(query = "") {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);
}

function escapeRegex(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pre-compile country regexes once at module load to avoid repeated RegExp construction
const COUNTRY_REGION_PATTERNS = Object.entries(COUNTRY_REGION_MAP).map(
  ([country, region]) => [new RegExp(`\\b${escapeRegex(country)}\\b`, "i"), region]
);

function inferRegionFromText(query = "") {
  const lower = query.toLowerCase();
  for (const [rx, region] of COUNTRY_REGION_PATTERNS) {
    if (rx.test(lower)) return region;
  }
  return null;
}

function scoreRelevance(item, queryTokens = []) {
  const titleLower = (item.title || "").toLowerCase();
  const haystack = `${titleLower} ${(item.summary || "").toLowerCase()} ${(item.type || "").toLowerCase()}`;
  return queryTokens.reduce((score, token) => {
    if (titleLower.includes(token)) return score + 2;
    if (haystack.includes(token)) return score + 1;
    return score;
  }, 0);
}

function scoreSpecificity(item, query = "") {
  const q = query.toLowerCase();
  const title = (item.title || "").toLowerCase();
  const type = (item.type || "").toLowerCase();
  let score = 0;

  if (/law|regulation|directive|rule|act|executive order/.test(type) || /act|rule|directive|order/.test(title)) {
    score += 2;
  }
  if (/hiring|employment/.test(q) && /hiring|employment|work/.test(title)) score += 3;
  if (/health|medical/.test(q) && /health|medical|fda/.test(title)) score += 3;
  if (/sustain|climate|esg|disclosure/.test(q) && /sustain|climate|esg|disclosure|ifrs|csrd|csddd/.test(title)) score += 3;
  if (/foundation|gpai|genai|llm/.test(q) && /foundation|gpai|generative|nist/.test(title)) score += 2;

  return score;
}

function formatUseCaseSpecificSteps(useCase) {
  const specific = FRAMEWORK_RULES
    .filter((rule) => rule.match.test(useCase))
    .flatMap((rule) => rule.controls);

  const baseline = [
    "Map system scope, owner, downstream users, and regions where the model is deployed.",
    "Document risk controls, testing evidence, and accountable approvers in a versioned governance register.",
    "Create ongoing monitoring thresholds, incident triggers, and regulator/auditor-ready evidence retention.",
  ];

  return [...specific, ...baseline].slice(0, 6);
}

async function withRetry(label, fn, maxAttempts = 2) {
  let lastErr;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      const retryable = !status || status >= 500 || status === 429;
      if (!retryable || attempt === maxAttempts) break;
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt));
    }
  }
  throw new Error(`${label}: ${lastErr?.message || "unknown error"}`);
}

// Pre-build Sets of URLs for O(1) source membership lookups
const eurlexDocSet = new Set(SOURCES.eurlex.keyDocs.map((d) => d.url));
const govinfoDocSet = new Set(SOURCES.govinfo.keyDocs.map((d) => d.url));
const oecdDocSet = new Set(SOURCES.oecd.keyDocs.map((d) => d.url));

// Pre-build the static global corpus once at module load instead of on each call
const GLOBAL_CORPUS = [
  ...SOURCES.oecd.keyDocs,
  ...SOURCES.eurlex.keyDocs,
  ...SOURCES.govinfo.keyDocs,
].map((doc) => ({
  ...doc,
  source: doc.source || "Global Framework Corpus",
  region: doc.region || (eurlexDocSet.has(doc.url) ? "EU" : govinfoDocSet.has(doc.url) ? "US" : "Global"),
  summary: compactSummary(`${doc.title} (${doc.type}) — curated governance source.`),
}));

export function searchGlobalFrameworks(query, maxResults = 10) {
  const cacheKey = `global-frameworks:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const queryTokens = tokenizeQuery(query);
  const inferredRegion = inferRegionFromText(query);

  const ranked = GLOBAL_CORPUS
    .map((item) => {
      const regionBonus = inferredRegion && item.region === inferredRegion ? 2 : 0;
      const score = scoreRelevance(item, queryTokens) + scoreSpecificity(item, query) + regionBonus;
      return { ...item, _score: score };
    })
    .filter((item) => item._score > 0 || queryTokens.length === 0)
    .sort((a, b) => (b._score - a._score) || (new Date(b.date || 0) - new Date(a.date || 0)))
    .slice(0, maxResults)
    .map(({ _score, ...item }) => item);

  setCached(cacheKey, ranked);
  return ranked;
}

export function getAppliedFrameworkGuidance(useCase = "general ai system", region = "all", maxFrameworks = 4) {
  const cacheKey = `applied-guidance:${useCase}:${region}:${maxFrameworks}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const frameworks = dedupeByUrl([
    ...SOURCES.eurlex.keyDocs.map((d) => ({ ...d, region: "EU", source: "EUR-Lex" })),
    ...SOURCES.govinfo.keyDocs.map((d) => ({ ...d, region: "US", source: "US Federal" })),
    ...SOURCES.oecd.keyDocs.map((d) => ({ ...d, region: "Global", source: "OECD / Global" })),
  ]);

  const inferredRegion = inferRegionFromText(useCase);
  const effectiveRegion = region === "all" && inferredRegion ? inferredRegion : region;
  const queryTokens = tokenizeQuery(useCase);
  const specificSteps = formatUseCaseSpecificSteps(useCase);

  const filteredByRegion = frameworks.filter((item) => effectiveRegion === "all" || item.region === effectiveRegion);
  const ranked = filteredByRegion
    .map((item) => {
      const baseScore = scoreRelevance(item, queryTokens);
      const specificity = scoreSpecificity(item, useCase);
      const recency = item.date ? new Date(item.date).getTime() / 1e13 : 0;
      return { ...item, _score: baseScore + specificity + recency };
    })
    .sort((a, b) => b._score - a._score)
    .slice(0, maxFrameworks)
    .map(({ _score, ...item }) => ({
      ...item,
      whyItApplies: `${item.title} is directly relevant to "${useCase}" because it provides enforceable or operational controls for this type of deployment in ${item.region}.`,
      implementationSteps: specificSteps,
      resourceType: item.type,
      applicability: {
        inferredRegion: inferredRegion || null,
        selectedRegion: effectiveRegion,
      },
    }));

  setCached(cacheKey, ranked);
  return ranked;
}

async function fetchFallbackUpdates(region = "all", maxItems = 20) {
  const fallbackQueriesByRegion = {
    EU: ["AI Act", "sustainability reporting AI", "digital product passport"],
    US: ["artificial intelligence", "climate disclosure", "algorithmic accountability"],
    Global: ["AI governance", "AI sustainability", "responsible AI standards"],
  };

  const activeRegions = region === "all" ? ["EU", "US", "Global"] : [region];
  const fallbackItems = [];

  await Promise.allSettled(
    activeRegions.flatMap((activeRegion) => {
      const queries = fallbackQueriesByRegion[activeRegion] || ["AI governance"];
      return queries.map(async (query) => {
        if (activeRegion === "EU") {
          const items = await searchEurLex(query, 4);
          fallbackItems.push(...items.map((item) => ({
            ...item,
            source: item.source || "EUR-Lex",
            summary: compactSummary(item.summary || "EU legal and policy source."),
            retrievalMode: "fallback-search",
          })));
        }

        if (activeRegion === "US") {
          const items = await searchFederalRegister(query, 4);
          fallbackItems.push(...items.map((item) => ({
            ...item,
            source: item.source || "Federal Register",
            summary: compactSummary(item.summary || "US federal policy and regulatory source."),
            retrievalMode: "fallback-search",
          })));
        }

        if (activeRegion === "Global") {
          SOURCES.oecd.keyDocs.forEach((doc) => {
            fallbackItems.push({
              ...doc,
              source: "OECD / Global Framework",
              region: "Global",
              summary: compactSummary(`${doc.title} — global policy framework reference.`),
              retrievalMode: "fallback-keydocs",
            });
          });
        }
      });
    })
  );

  return dedupeByUrl(fallbackItems)
    .sort((a, b) => (new Date(b.date || 0) - new Date(a.date || 0)))
    .slice(0, maxItems);
}

export async function searchEurLex(query, maxResults = 10) {
  const cacheKey = `eurlex:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const params = new URLSearchParams({
      scope: "EURLEX",
      text: query,
      lang: "en",
      type: "quick",
      qid: Date.now().toString(),
    });

    const res = await withRetry("EUR-Lex request", () => http.get(
      `https://eur-lex.europa.eu/search.html?${params}`,
      { responseType: "text" }
    ));

    const $ = cheerio.load(res.data);
    const results = [];

    $(".SearchResult").each((i, el) => {
      if (i >= maxResults) return false;
      const title = $(el).find(".title a").text().trim();
      const href = $(el).find(".title a").attr("href");
      const date = $(el).find(".date").text().trim();
      const summary = $(el).find(".snippet").text().trim();

      if (title) {
        results.push({
          title,
          url: href ? `https://eur-lex.europa.eu${href}` : null,
          date: date || null,
          summary: summary || null,
          source: "EUR-Lex",
          region: "EU",
        });
      }
    });

    if (results.length === 0) {
      const q = query.toLowerCase();
      SOURCES.eurlex.keyDocs.forEach((doc) => {
        if (doc.title.toLowerCase().includes(q) || q.includes("ai act") || q.includes("gdpr")) {
          results.push({ ...doc, source: "EUR-Lex (known)", region: "EU" });
        }
      });
    }

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    console.error("EUR-Lex search error:", err.message);
    return SOURCES.eurlex.keyDocs.map((d) => ({
      ...d,
      source: "EUR-Lex (offline cache)",
      region: "EU",
      retrievalMode: "offline-cache",
    }));
  }
}

export async function searchFederalRegister(query, maxResults = 10) {
  const cacheKey = `fedregister:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await withRetry("Federal Register request", () => http.get("https://www.federalregister.gov/api/v1/articles", {
      params: {
        conditions: { term: query },
        fields: ["title", "document_number", "publication_date", "abstract", "html_url", "type", "agencies"],
        per_page: maxResults,
        order: "newest",
      },
    }));

    const results = (res.data.results || []).map((item) => ({
      title: item.title,
      url: item.html_url,
      date: item.publication_date,
      summary: item.abstract,
      type: item.type,
      agencies: item.agencies?.map((a) => a.name).join(", "),
      source: "Federal Register",
      region: "US",
    }));

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    console.error("Federal Register search error:", err.message);
    return SOURCES.govinfo.keyDocs.map((d) => ({
      ...d,
      source: "GovInfo (offline cache)",
      region: "US",
      retrievalMode: "offline-cache",
    }));
  }
}

export async function searchGovInfo(query, maxResults = 10) {
  const cacheKey = `govinfo:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await withRetry("GovInfo request", () => http.get("https://api.govinfo.gov/search", {
      params: {
        query,
        pageSize: maxResults,
        offsetMark: "*",
        sorts: [{ field: "publishdate", sortOrder: "DESC" }],
        filters: {
          collectionCode: ["BILLS", "CREC", "FR"],
        },
      },
    }));

    const results = (res.data.results || []).map((item) => ({
      title: item.title,
      url: item.detailsLink,
      date: item.publishdate,
      summary: item.description,
      type: item.docType,
      source: "GovInfo",
      region: "US",
    }));

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    console.error("GovInfo search error:", err.message);
    return [];
  }
}

export async function fetchRSSUpdates(region = "all", maxItems = 20) {
  const cacheKey = `rss:${region}:${maxItems}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const feedsToFetch = region === "all"
    ? ALL_RSS_FEEDS
    : ALL_RSS_FEEDS.filter((f) => {
      if (region === "EU") return SOURCES.eurlex.rssFeeds.includes(f);
      if (region === "US") return SOURCES.govinfo.rssFeeds.includes(f);
      if (region === "Global") return SOURCES.oecd.rssFeeds.includes(f) || SOURCES.news.rssFeeds.includes(f);
      return true;
    });

  const allItems = [];
  let successfulFeeds = 0;

  await Promise.allSettled(
    feedsToFetch.map(async (feed) => {
      try {
        const parsed = await rssParser.parseURL(feed.url);
        successfulFeeds += 1;
        const items = (parsed.items || []).slice(0, 5).map((item) => ({
          title: item.title,
          url: item.link,
          date: item.pubDate || item.isoDate,
          summary: compactSummary(item.contentSnippet || item.summary || ""),
          feedLabel: feed.label,
          source: parsed.title || feed.label,
          region: feed.label.includes("EU") || feed.label.includes("EUR")
            ? "EU"
            : feed.label.includes("Federal")
            ? "US"
            : "Global",
          retrievalMode: "rss-live",
        }));
        allItems.push(...items);
      } catch (err) {
        console.error(`RSS feed error (${feed.label}):`, err.message);
      }
    })
  );

  const dedupedRssItems = dedupeByUrl(allItems).sort((a, b) => {
    const da = a.date ? new Date(a.date) : 0;
    const db = b.date ? new Date(b.date) : 0;
    return db - da;
  });

  const results = dedupedRssItems.slice(0, maxItems);

  if (successfulFeeds === 0 || results.length === 0) {
    const fallbackResults = await fetchFallbackUpdates(region, maxItems);
    setCached(cacheKey, fallbackResults);
    return fallbackResults;
  }

  setCached(cacheKey, results);
  return results;
}

export async function getSustainabilityGovernanceBriefing(region = "all", maxItems = 12) {
  const updates = await fetchRSSUpdates(region, maxItems);
  const sustainabilityKeywords = [
    "sustain", "climate", "energy", "environment", "esg", "csrd", "csddd", "disclosure", "green", "emission",
  ];

  const filteredUpdates = updates.filter((item) => {
    const text = `${item.title || ""} ${item.summary || ""}`.toLowerCase();
    return sustainabilityKeywords.some((kw) => text.includes(kw));
  });

  const globalDocs = [
    ...SOURCES.eurlex.keyDocs,
    ...SOURCES.govinfo.keyDocs,
    ...SOURCES.oecd.keyDocs,
  ].filter((doc) => {
    const text = `${doc.title} ${doc.type}`.toLowerCase();
    return sustainabilityKeywords.some((kw) => text.includes(kw));
  });

  return {
    updates: dedupeByUrl(filteredUpdates).slice(0, maxItems),
    keyDocuments: dedupeByUrl(globalDocs).slice(0, 10),
    generatedAt: new Date().toISOString(),
  };
}

export function getKeyDocuments(region = "all") {
  if (region === "all") return ALL_KEY_DOCS;
  return ALL_KEY_DOCS.filter(
    (d) =>
      (region === "EU" && eurlexDocSet.has(d.url)) ||
      (region === "US" && govinfoDocSet.has(d.url)) ||
      (region === "Global" && oecdDocSet.has(d.url))
  );
}

export async function fetchDocumentContent(url) {
  const cacheKey = `doc:${url}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await withRetry("Document fetch", () => http.get(url, { responseType: "text" }));
    const $ = cheerio.load(res.data);

    $("nav, script, style, footer, header, .cookie-banner, .navigation").remove();

    const selectors = ["article", "main", ".content", "#content", ".document-body", ".text"];
    let text = "";
    for (const sel of selectors) {
      const found = $(sel).text().trim();
      if (found.length > 200) {
        text = found;
        break;
      }
    }
    if (!text) text = $("body").text().trim();

    text = text.replace(/\s+/g, " ").trim().slice(0, 8000);

    const result = {
      url,
      title: $("title").text().trim() || $("h1").first().text().trim(),
      content: text,
      fetchedAt: new Date().toISOString(),
    };

    setCached(cacheKey, result);
    return result;
  } catch (err) {
    return {
      url,
      error: `Could not fetch document: ${err.message}`,
      fetchedAt: new Date().toISOString(),
    };
  }
}

export async function globalSearch(query, options = {}) {
  const { maxResults = 10, regions = ["EU", "US", "Global"] } = options;

  const searches = [];

  if (regions.includes("EU")) searches.push(searchEurLex(query, maxResults));
  if (regions.includes("US")) {
    searches.push(searchFederalRegister(query, maxResults));
    searches.push(searchGovInfo(query, Math.min(maxResults, 5)));
  }
  if (regions.includes("Global")) searches.push(Promise.resolve(searchGlobalFrameworks(query, maxResults)));

  const allResults = await Promise.allSettled(searches);
  const combined = [];

  allResults.forEach((r) => {
    if (r.status === "fulfilled") combined.push(...r.value);
  });

  const queryTokens = tokenizeQuery(query);
  const inferredRegion = inferRegionFromText(query);

  const deduped = dedupeByUrl(combined)
    .map((item) => {
      const regionBonus = inferredRegion && item.region === inferredRegion ? 2 : 0;
      const score = scoreRelevance(item, queryTokens) + scoreSpecificity(item, query) + regionBonus;
      return {
        ...item,
        summary: item.summary ? compactSummary(item.summary) : item.summary,
        _score: score,
      };
    })
    .sort((a, b) => (b._score - a._score) || (new Date(b.date || 0) - new Date(a.date || 0)));

  const diversified = [];
  const seenSources = new Set();
  for (const item of deduped) {
    if (diversified.length >= maxResults * 2) break;
    if (!seenSources.has(item.source) || diversified.length < maxResults) {
      diversified.push(item);
      seenSources.add(item.source);
    }
  }

  return diversified.map(({ _score, ...item }) => item);
}
