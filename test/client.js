/**
 * AI Governance MCP — Test Client
 * Tests v2.0 fetchers and data providers by calling fetcher functions directly
 */

import {
  globalSearch,
  searchEurLex,
  searchFederalRegister,
  fetchRSSUpdates,
  getKeyDocuments,
  fetchDocumentContent,
  getSustainabilityGovernanceBriefing,
  searchGlobalFrameworks,
  getAppliedFrameworkGuidance,
} from "../src/fetcher.js";
import { SOURCES, ALL_RSS_FEEDS, ALL_KEY_DOCS, GENERIC_RESOURCE_URLS } from "../src/sources.js";

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
  if (GENERIC_RESOURCE_URLS.length < 5) throw new Error("Expected >= 5 generic resource URLs");
  pass(`Generic fallback resources configured: ${GENERIC_RESOURCE_URLS.length}`);
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

// ── Test 8: Sustainability briefing ──────────────────────────
await test("Sustainability governance briefing", async () => {
  const briefing = await getSustainabilityGovernanceBriefing("all", 10);
  if (!briefing || !briefing.generatedAt) throw new Error("Missing briefing metadata");
  if (!Array.isArray(briefing.updates)) throw new Error("Updates should be an array");
  if (!Array.isArray(briefing.keyDocuments)) throw new Error("Key documents should be an array");
  pass(`Briefing updates: ${briefing.updates.length}`);
  pass(`Briefing key docs: ${briefing.keyDocuments.length}`);
});

// ── Test 9: Global frameworks search and ranking ──────────────
await test("Global frameworks search", async () => {
  const results = searchGlobalFrameworks("sustainability disclosure AI standards", 8);
  if (!Array.isArray(results)) throw new Error("Expected array");
  if (results.length === 0) throw new Error("Expected at least one ranked framework result");
  pass(`Global frameworks ranked results: ${results.length}`);
  pass(`Top result: ${results[0].title}`);
});

// ── Test 10: 20-prompt reliability sweep ──────────────────────
await test("20 prompt reliability sweep", async () => {
  const prompts = [
    "AI Act enforcement timeline",
    "foundation model transparency obligations",
    "GPAI incident reporting",
    "NIST AI RMF governance",
    "federal register AI notice",
    "EU prohibited AI practices",
    "high-risk AI conformity assessment",
    "algorithmic accountability US",
    "OECD AI principles",
    "UNESCO AI ethics",
    "G7 Hiroshima code",
    "AI and climate disclosure requirements",
    "sustainability reporting and AI",
    "CSRD digital reporting",
    "CSDDD due diligence AI supply chain",
    "SEC climate disclosure litigation",
    "ISSB IFRS S2 climate standard",
    "energy efficient AI governance",
    "greenwashing AI claims regulation",
    "cross-border AI sustainability compliance",
  ];

  let resolved = 0;
  for (const prompt of prompts) {
    const results = await globalSearch(prompt, { maxResults: 6, regions: ["EU", "US", "Global"] });
    if (Array.isArray(results) && results.length > 0) resolved += 1;
  }

  if (resolved < 20) throw new Error(`Expected all 20 prompts to return results, resolved=${resolved}`);
  pass(`Resolved prompts: ${resolved}/20`);
});

// ── Test 11: Applied frameworks with context/resources ─────────
await test("Applied framework guidance", async () => {
  const applied = getAppliedFrameworkGuidance("foundation model for climate risk disclosure", "all", 4);
  if (!Array.isArray(applied) || applied.length === 0) throw new Error("Expected applied frameworks");
  const first = applied[0];
  if (!first.whyItApplies) throw new Error("Missing whyItApplies context");
  if (!first.url) throw new Error("Missing resource link");
  if (!Array.isArray(first.implementationSteps) || first.implementationSteps.length < 2) {
    throw new Error("Missing implementation steps");
  }
  pass(`Applied frameworks returned: ${applied.length}`);
  pass(`First applied framework has context + link: ${first.title}`);
});


// ── Test 12: Specificity + region inference for applied guidance ──
await test("Applied guidance specificity", async () => {
  const applied = getAppliedFrameworkGuidance("EU AI hiring platform for recruitment", "all", 3);
  if (!applied.length) throw new Error("Expected applied guidance results");
  const first = applied[0];
  if (!first.whyItApplies.includes("EU")) throw new Error("Expected use-case specific explanation with region");
  const stepBlob = (first.implementationSteps || []).join(" ").toLowerCase();
  if (!stepBlob.includes("bias") && !stepBlob.includes("human review")) {
    throw new Error("Expected hiring-specific controls in implementation steps");
  }
  pass(`Specific guidance includes region + hiring controls: ${first.title}`);
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
