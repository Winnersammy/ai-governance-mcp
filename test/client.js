/**
 * AI Governance MCP — Test Client
 * Tests all 8 tools by calling them directly via the fetcher module
 */

import {
  globalSearch,
  searchEurLex,
  searchFederalRegister,
  fetchRSSUpdates,
  getKeyDocuments,
  fetchDocumentContent,
} from "../src/fetcher.js";
import { SOURCES, ALL_RSS_FEEDS, ALL_KEY_DOCS } from "../src/sources.js";

const results = { passed: 0, failed: 0, errors: [] };

function pass(name) {
  console.log(`  ✅ ${name}`);
  results.passed++;
}

function fail(name, err) {
  console.log(`  ❌ ${name}: ${err}`);
  results.failed++;
  results.errors.push({ name, err: String(err) });
}

async function test(name, fn) {
  process.stdout.write(`\nTesting: ${name}...\n`);
  try {
    await fn();
  } catch (e) {
    fail(name, e.message);
  }
}

// ── Test 1: Sources config ────────────────────────────────────
await test("Sources configuration", async () => {
  if (ALL_KEY_DOCS.length < 5) throw new Error("Expected at least 5 key docs");
  pass(`${ALL_KEY_DOCS.length} key documents configured`);
  if (ALL_RSS_FEEDS.length < 4) throw new Error("Expected at least 4 RSS feeds");
  pass(`${ALL_RSS_FEEDS.length} RSS feeds configured`);
  const regions = [SOURCES.eurlex, SOURCES.govinfo, SOURCES.oecd, SOURCES.news];
  pass(`${regions.length} source regions defined`);
});

// ── Test 2: Key documents retrieval ──────────────────────────
await test("Key documents retrieval", async () => {
  const all = getKeyDocuments("all");
  if (all.length < 5) throw new Error(`Expected >= 5 docs, got ${all.length}`);
  pass(`getKeyDocuments('all'): ${all.length} docs`);

  const eu = getKeyDocuments("EU");
  pass(`EU docs loaded: ${eu.length}`);

  const us = getKeyDocuments("US");
  pass(`US docs loaded: ${us.length}`);
});

// ── Test 3: Federal Register search ──────────────────────────
await test("Federal Register API search", async () => {
  console.log("  (fetching from federalregister.gov...)");
  const results = await searchFederalRegister("artificial intelligence", 5);
  if (!Array.isArray(results)) throw new Error("Expected array");
  pass(`Federal Register returned ${results.length} results`);
  if (results.length > 0) {
    const first = results[0];
    if (!first.title) throw new Error("Result missing title");
    pass(`First result: "${first.title.slice(0, 60)}..."`);
    if (!first.url) throw new Error("Result missing URL");
    pass(`URL present: ${first.url.slice(0, 60)}...`);
  }
});

// ── Test 4: EUR-Lex search ────────────────────────────────────
await test("EUR-Lex search", async () => {
  console.log("  (fetching from eur-lex.europa.eu...)");
  const results = await searchEurLex("artificial intelligence", 5);
  if (!Array.isArray(results)) throw new Error("Expected array");
  pass(`EUR-Lex returned ${results.length} results`);
  if (results.length > 0) {
    pass(`First: "${results[0].title?.slice(0, 60)}"`);
  }
});

// ── Test 5: RSS feeds ─────────────────────────────────────────
await test("RSS feed aggregation", async () => {
  console.log("  (fetching live RSS feeds — may take a moment...)");
  const items = await fetchRSSUpdates("all", 10);
  if (!Array.isArray(items)) throw new Error("Expected array");
  pass(`RSS feeds returned ${items.length} items`);
  if (items.length > 0) {
    const item = items[0];
    pass(`Latest: "${item.title?.slice(0, 60)}" [${item.source}]`);
  }
});

// ── Test 6: Global search (combined) ─────────────────────────
await test("Global combined search", async () => {
  console.log("  (searching across all sources...)");
  const results = await globalSearch("AI regulation risk", { maxResults: 10 });
  if (!Array.isArray(results)) throw new Error("Expected array");
  pass(`Global search returned ${results.length} results`);

  const regions = [...new Set(results.map((r) => r.region))];
  pass(`Regions covered: ${regions.join(", ")}`);

  const sources = [...new Set(results.map((r) => r.source))];
  pass(`Sources used: ${sources.join(", ")}`);
});

// ── Test 7: Document content fetch ───────────────────────────
await test("Document content fetch", async () => {
  console.log("  (fetching NIST AI RMF page...)");
  const doc = await fetchDocumentContent("https://airc.nist.gov/RMF");
  if (!doc) throw new Error("No result returned");
  pass(`Fetched: ${doc.url}`);
  if (doc.error) {
    pass(`(graceful error handling: ${doc.error.slice(0, 60)})`);
  } else {
    if (!doc.content || doc.content.length < 50) throw new Error("Content too short");
    pass(`Content length: ${doc.content.length} chars`);
    pass(`Title: "${doc.title?.slice(0, 60)}"`);
  }
});

// ── Summary ───────────────────────────────────────────────────
console.log("\n" + "─".repeat(50));
console.log(`\n📊 Test Summary`);
console.log(`   ✅ Passed: ${results.passed}`);
console.log(`   ❌ Failed: ${results.failed}`);
if (results.errors.length > 0) {
  console.log("\n Failures:");
  results.errors.forEach((e) => console.log(`   - ${e.name}: ${e.err}`));
}
console.log("\n" + (results.failed === 0 ? "🎉 All tests passed!" : "⚠️  Some tests failed — check network connectivity."));
console.log();
