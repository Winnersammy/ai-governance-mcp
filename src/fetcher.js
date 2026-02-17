import axios from "axios";
import * as cheerio from "cheerio";
import RSSParser from "rss-parser";
import { SOURCES, ALL_RSS_FEEDS, ALL_KEY_DOCS } from "./sources.js";

const rssParser = new RSSParser({
  timeout: 10000,
  headers: { "User-Agent": "AI-Governance-MCP/1.0" },
});

const http = axios.create({
  timeout: 15000,
  headers: { "User-Agent": "AI-Governance-MCP/1.0" },
});

// ─── Simple in-memory cache ─────────────────────────────────────
const cache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  return null;
}
function setCached(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── EUR-Lex ────────────────────────────────────────────────────

export async function searchEurLex(query, maxResults = 10) {
  const cacheKey = `eurlex:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    // EUR-Lex search via their public search endpoint
    const params = new URLSearchParams({
      scope: "EURLEX",
      text: query,
      lang: "en",
      type: "quick",
      qid: Date.now().toString(),
    });

    const res = await http.get(
      `https://eur-lex.europa.eu/search.html?${params}`,
      { responseType: "text" }
    );

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
          url: href
            ? `https://eur-lex.europa.eu${href}`
            : null,
          date: date || null,
          summary: summary || null,
          source: "EUR-Lex",
          region: "EU",
        });
      }
    });

    // Fallback: also include known key docs that match
    if (results.length === 0) {
      const q = query.toLowerCase();
      SOURCES.eurlex.keyDocs.forEach((doc) => {
        if (
          doc.title.toLowerCase().includes(q) ||
          q.includes("ai act") ||
          q.includes("gdpr")
        ) {
          results.push({ ...doc, source: "EUR-Lex (known)", region: "EU" });
        }
      });
    }

    setCached(cacheKey, results);
    return results;
  } catch (err) {
    // On error, return known key docs as fallback
    console.error("EUR-Lex search error:", err.message);
    return SOURCES.eurlex.keyDocs.map((d) => ({
      ...d,
      source: "EUR-Lex (offline cache)",
      region: "EU",
    }));
  }
}

// ─── US Federal Register ────────────────────────────────────────

export async function searchFederalRegister(query, maxResults = 10) {
  const cacheKey = `fedregister:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await http.get("https://www.federalregister.gov/api/v1/articles", {
      params: {
        conditions: { term: query },
        fields: ["title", "document_number", "publication_date", "abstract", "html_url", "type", "agencies"],
        per_page: maxResults,
        order: "newest",
      },
    });

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
    }));
  }
}

// ─── GovInfo (congressional bills, etc.) ───────────────────────

export async function searchGovInfo(query, maxResults = 10) {
  const cacheKey = `govinfo:${query}:${maxResults}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await http.get("https://api.govinfo.gov/search", {
      params: {
        query,
        pageSize: maxResults,
        offsetMark: "*",
        sorts: [{ field: "publishdate", sortOrder: "DESC" }],
        // Filter to relevant collections
        filters: {
          collectionCode: ["BILLS", "CREC", "FR"],
        },
      },
    });

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

// ─── RSS Feed Aggregator ────────────────────────────────────────

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

  await Promise.allSettled(
    feedsToFetch.map(async (feed) => {
      try {
        const parsed = await rssParser.parseURL(feed.url);
        const items = (parsed.items || []).slice(0, 5).map((item) => ({
          title: item.title,
          url: item.link,
          date: item.pubDate || item.isoDate,
          summary: item.contentSnippet || item.summary,
          feedLabel: feed.label,
          source: parsed.title || feed.label,
          region: feed.label.includes("EU") || feed.label.includes("EUR")
            ? "EU"
            : feed.label.includes("Federal")
            ? "US"
            : "Global",
        }));
        allItems.push(...items);
      } catch (err) {
        console.error(`RSS feed error (${feed.label}):`, err.message);
      }
    })
  );

  // Sort by date descending
  allItems.sort((a, b) => {
    const da = a.date ? new Date(a.date) : 0;
    const db = b.date ? new Date(b.date) : 0;
    return db - da;
  });

  const results = allItems.slice(0, maxItems);
  setCached(cacheKey, results);
  return results;
}

// ─── Key Documents Lookup ───────────────────────────────────────

export function getKeyDocuments(region = "all") {
  if (region === "all") return ALL_KEY_DOCS;
  return ALL_KEY_DOCS.filter(
    (d) =>
      (region === "EU" && SOURCES.eurlex.keyDocs.includes(d)) ||
      (region === "US" && SOURCES.govinfo.keyDocs.includes(d)) ||
      (region === "Global" && SOURCES.oecd.keyDocs.includes(d))
  );
}

// ─── Full-text fetch for a specific document URL ───────────────

export async function fetchDocumentContent(url) {
  const cacheKey = `doc:${url}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const res = await http.get(url, { responseType: "text" });
    const $ = cheerio.load(res.data);

    // Remove nav, scripts, ads
    $("nav, script, style, footer, header, .cookie-banner, .navigation").remove();

    // Try to find main content
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

    // Clean up whitespace
    text = text.replace(/\s+/g, " ").trim().slice(0, 8000); // limit to 8k chars

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

// ─── Combined global search ─────────────────────────────────────

export async function globalSearch(query, options = {}) {
  const { maxResults = 10, regions = ["EU", "US", "Global"] } = options;

  const searches = [];

  if (regions.includes("EU")) {
    searches.push(searchEurLex(query, maxResults));
  }
  if (regions.includes("US")) {
    searches.push(searchFederalRegister(query, maxResults));
    searches.push(searchGovInfo(query, Math.min(maxResults, 5)));
  }

  const allResults = await Promise.allSettled(searches);
  const combined = [];

  allResults.forEach((r) => {
    if (r.status === "fulfilled") combined.push(...r.value);
  });

  // Deduplicate by URL
  const seen = new Set();
  const deduped = combined.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });

  return deduped.slice(0, maxResults * 2);
}
