#!/usr/bin/env node
/**
 * AI Governance MCP Server
 * Exposes tools for accessing AI laws, regulations, and policy frameworks
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  globalSearch,
  searchEurLex,
  searchFederalRegister,
  fetchRSSUpdates,
  getKeyDocuments,
  fetchDocumentContent,
} from "./fetcher.js";
import { SOURCES } from "./sources.js";

const server = new McpServer({
  name: "ai-governance-mcp",
  version: "1.0.0",
});

// ─── Tool 1: Global Search ──────────────────────────────────────
server.tool(
  "search_ai_governance",
  {
    query: z.string().describe("Search query, e.g. 'foundation model requirements', 'AI liability', 'risk management'"),
    regions: z.array(z.enum(["EU", "US", "Global"])).optional().default(["EU", "US", "Global"])
      .describe("Regions to search"),
    max_results: z.number().int().min(1).max(30).optional().default(10)
      .describe("Maximum results to return"),
  },
  async ({ query, regions, max_results }) => {
    const results = await globalSearch(query, { maxResults: max_results, regions });

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: `No results found for "${query}". Try broader terms like 'artificial intelligence' or 'AI regulation'.` }],
      };
    }

    const formatted = results.map((r, i) =>
      [
        `${i + 1}. **${r.title}**`,
        `   Region: ${r.region} | Source: ${r.source}`,
        r.date ? `   Date: ${r.date}` : null,
        r.type ? `   Type: ${r.type}` : null,
        r.summary ? `   Summary: ${r.summary.slice(0, 200)}...` : null,
        r.url ? `   URL: ${r.url}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    ).join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: `## AI Governance Search Results: "${query}"\n\nFound ${results.length} results\n\n${formatted}`,
        },
      ],
    };
  }
);

// ─── Tool 2: Latest Updates (RSS) ──────────────────────────────
server.tool(
  "get_latest_ai_governance_updates",
  {
    region: z.enum(["all", "EU", "US", "Global"]).optional().default("all")
      .describe("Filter by region"),
    max_items: z.number().int().min(1).max(50).optional().default(15)
      .describe("Maximum items to return"),
  },
  async ({ region, max_items }) => {
    const items = await fetchRSSUpdates(region, max_items);

    if (items.length === 0) {
      return {
        content: [{
          type: "text",
          text: "Could not fetch live updates right now. RSS feeds may be temporarily unavailable.",
        }],
      };
    }

    const formatted = items.map((item, i) =>
      [
        `${i + 1}. **${item.title}**`,
        `   Source: ${item.source} | Region: ${item.region}`,
        item.date ? `   Published: ${new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : null,
        item.summary ? `   ${item.summary.slice(0, 200)}` : null,
        item.url ? `   🔗 ${item.url}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    ).join("\n\n");

    return {
      content: [{
        type: "text",
        text: `## Latest AI Governance Updates — ${region === "all" ? "All Regions" : region}\n\n${formatted}`,
      }],
    };
  }
);

// ─── Tool 3: Key Documents by Region ───────────────────────────
server.tool(
  "get_key_ai_governance_documents",
  {
    region: z.enum(["all", "EU", "US", "Global"]).optional().default("all")
      .describe("Filter documents by region"),
  },
  async ({ region }) => {
    const docs = getKeyDocuments(region);

    const byRegion = {};
    docs.forEach((doc) => {
      const r = SOURCES.eurlex.keyDocs.includes(doc)
        ? "EU"
        : SOURCES.govinfo.keyDocs.includes(doc)
        ? "US"
        : "Global / OECD";
      if (!byRegion[r]) byRegion[r] = [];
      byRegion[r].push(doc);
    });

    let text = `## Key AI Governance Documents\n\n`;

    Object.entries(byRegion).forEach(([r, items]) => {
      text += `### ${r}\n\n`;
      items.forEach((doc) => {
        text += `**${doc.title}**\n`;
        text += `- Type: ${doc.type}\n`;
        text += `- Date: ${doc.date}\n`;
        text += `- Status: ${doc.status}\n`;
        text += `- URL: ${doc.url}\n\n`;
      });
    });

    return {
      content: [{ type: "text", text }],
    };
  }
);

// ─── Tool 4: EU AI Act Specific ────────────────────────────────
server.tool(
  "get_eu_ai_act_info",
  {
    topic: z.string().optional().describe("Optional specific topic within the EU AI Act, e.g. 'prohibited practices', 'high-risk systems', 'foundation models', 'transparency'"),
  },
  async ({ topic }) => {
    const euAiActSummary = `## EU Artificial Intelligence Act (2024/1689)

**Status:** In force as of August 1, 2024
**Full application:** August 2, 2026 (phased rollout)
**Official text:** https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689

### Timeline
- Aug 2024: Regulation enters into force
- Feb 2025: Prohibited AI practices rules apply
- Aug 2025: GPAI (General Purpose AI) and governance rules apply
- Aug 2026: Most provisions fully applicable
- Aug 2027: High-risk AI systems in Annex I fully applicable

### Risk Classification
1. **Unacceptable Risk (Prohibited):** Social scoring, real-time biometric surveillance, manipulation of vulnerable groups, AI exploiting subconscious behaviour
2. **High Risk:** Biometrics, critical infrastructure, education, employment, essential services, law enforcement, migration, justice
3. **Limited Risk:** Chatbots (must disclose AI), deepfakes (must label)
4. **Minimal Risk:** Most AI applications (voluntary codes of conduct)

### General Purpose AI (GPAI) — Title VIII
- Providers of GPAI models must provide technical documentation, comply with copyright law
- "Systemic risk" GPAI (≥10²⁵ FLOPs training): adversarial testing, incident reporting, cybersecurity measures
- Codes of practice to be developed by industry

### Penalties
- Up to €35M or 7% global annual turnover for prohibited AI violations
- Up to €15M or 3% for other violations
- Up to €7.5M or 1.5% for incorrect information to authorities

### Key Bodies
- EU AI Office (within European Commission) — oversees GPAI
- National competent authorities in each EU member state
- European Artificial Intelligence Board`;

    // If a specific topic is requested, also search for it
    let additionalResults = "";
    if (topic) {
      const results = await searchEurLex(`AI Act ${topic}`, 5);
      if (results.length > 0) {
        additionalResults = `\n\n### EUR-Lex Search Results: "${topic}"\n\n` +
          results.map((r, i) => `${i + 1}. [${r.title}](${r.url}) — ${r.date || ""}`).join("\n");
      }
    }

    return {
      content: [{
        type: "text",
        text: euAiActSummary + additionalResults,
      }],
    };
  }
);

// ─── Tool 5: US AI Policy ───────────────────────────────────────
server.tool(
  "get_us_ai_policy",
  {
    topic: z.string().optional().describe("Optional specific topic, e.g. 'executive orders', 'NIST framework', 'AI bills', 'safety'"),
  },
  async ({ topic }) => {
    const usPolicySummary = `## US AI Policy Landscape

### Current Executive Direction (2025)
**EO 14179 — Removing Barriers to American Leadership in AI** (Jan 20, 2025)
- Revoked Biden-era EO 14110 on AI Safety
- Directs agencies to develop AI action plan within 180 days
- Emphasis on American AI dominance, reducing regulatory burden
- URL: https://www.federalregister.gov/documents/2025/01/23/2025-01953/

### Previous Administration (2023)
**EO 14110 — Safe, Secure, and Trustworthy AI** (Oct 30, 2023) — NOW REVOKED
- Required safety testing disclosures for frontier AI
- NIST AI Safety Institute established
- Directed federal agencies to assess AI risks

### Key Frameworks & Standards
**NIST AI Risk Management Framework (AI RMF 1.0)** — Jan 2023
- Voluntary framework: Govern, Map, Measure, Manage
- URL: https://airc.nist.gov/RMF

**NIST Generative AI Profile (NIST AI 600-1)** — Jul 2024
- Addresses risks specific to generative AI
- URL: https://doi.org/10.6028/NIST.AI.600-1

### Congressional Activity
- Multiple AI bills introduced in 118th and 119th Congress
- No comprehensive federal AI law enacted yet (as of early 2025)
- State-level: California, Texas, Colorado, Utah have passed AI laws

### Federal Agency Guidance
- FTC: AI guidance on deception, endorsements
- FDA: AI/ML in medical devices framework
- SEC: AI-related disclosure guidance
- DOD: AI Ethics Principles (2020)`;

    let additionalResults = "";
    if (topic) {
      const results = await searchFederalRegister(`artificial intelligence ${topic}`, 5);
      if (results.length > 0) {
        additionalResults = `\n\n### Federal Register Results: "${topic}"\n\n` +
          results.map((r, i) => `${i + 1}. **${r.title}**\n   ${r.date} | ${r.type}\n   ${r.url}`).join("\n\n");
      }
    }

    return {
      content: [{
        type: "text",
        text: usPolicySummary + additionalResults,
      }],
    };
  }
);

// ─── Tool 6: Global Frameworks (OECD, G7, UN) ─────────────────
server.tool(
  "get_global_ai_frameworks",
  {},
  async () => {
    const globalSummary = `## Global AI Governance Frameworks

### OECD AI Principles (2019, updated 2024)
- Adopted by 44+ countries
- Five principles: inclusive growth, human-centred values, transparency, robustness, accountability
- URL: https://oecd.ai/en/ai-principles

### G7 Hiroshima AI Process (2023)
- International Guiding Principles for AI (11 principles)
- Voluntary Code of Conduct for Advanced AI Systems
- Focus: responsible development of foundation/frontier models
- URL: https://www.meti.go.jp/press/2023/10/20231030002/20231030002-1.pdf

### UN — Global Digital Compact (2024)
- Adopted at UN Summit of the Future, Sept 2024
- Includes AI governance section
- Calls for international AI governance body
- URL: https://www.un.org/global-digital-compact

### UNESCO Recommendation on AI Ethics (2021)
- 193 member states
- Addresses bias, environment, gender, culture
- URL: https://unesdoc.unesco.org/ark:/48223/pf0000381137

### Bletchley Declaration (2023)
- AI Safety Summit — 28 countries
- Focuses on "frontier AI" risks
- UK, US, EU, China all signatories
- URL: https://www.gov.uk/government/publications/ai-safety-summit-2023-the-bletchley-declaration

### ISO/IEC Standards
- ISO/IEC 42001:2023 — AI Management System
- ISO/IEC 23894:2023 — AI Risk Management Guidance
- ISO/IEC TR 24027:2021 — Bias in AI Systems

### Regional Frameworks
| Region | Instrument | Status |
|--------|-----------|--------|
| EU | AI Act (2024/1689) | In force |
| China | Generative AI Measures | In force (2023) |
| UK | Pro-innovation AI Regulation | Sector-based approach |
| Canada | AIDA (Artificial Intelligence and Data Act) | Proposed |
| Brazil | AI Bill | In progress |
| Singapore | AI Governance Framework | Voluntary |
| Japan | AI Guidelines for Business | Voluntary |`;

    return {
      content: [{ type: "text", text: globalSummary }],
    };
  }
);

// ─── Tool 7: Fetch Document Content ────────────────────────────
server.tool(
  "fetch_governance_document",
  {
    url: z.string().url().describe("URL of the governance document to fetch and extract text from"),
  },
  async ({ url }) => {
    const doc = await fetchDocumentContent(url);

    if (doc.error) {
      return {
        content: [{
          type: "text",
          text: `## Document Fetch Failed\n\nURL: ${url}\nError: ${doc.error}`,
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: `## ${doc.title || "Document"}\n\nURL: ${doc.url}\nFetched: ${doc.fetchedAt}\n\n---\n\n${doc.content}`,
      }],
    };
  }
);

// ─── Tool 8: Compare Frameworks ────────────────────────────────
server.tool(
  "compare_ai_governance_frameworks",
  {
    topic: z.string().describe("Topic to compare across frameworks, e.g. 'foundation models', 'bias', 'transparency', 'enforcement', 'prohibited uses'"),
  },
  async ({ topic }) => {
    const comparisons = {
      "foundation models": `## Foundation Models / GPAI: Cross-Framework Comparison

| Framework | Requirements | Enforcement |
|-----------|-------------|-------------|
| EU AI Act (GPAI Title VIII) | Technical docs, copyright compliance, systemic risk assessment for largest models | EU AI Office, fines up to 3% global turnover |
| G7 Hiroshima Code | Identify & mitigate risks, incident reporting, cybersecurity, transparency | Voluntary |
| US EO 14110 (revoked) | Safety test results to govt for dual-use models | Revoked Jan 2025 |
| China Interim Measures | Security assessment, content moderation, real-name registration | CAC enforcement |
| UK approach | Sector regulators (Ofcom, ICO, CMA) | No specific GPAI law |`,

      "transparency": `## Transparency Requirements: Cross-Framework Comparison

| Framework | Requirements |
|-----------|-------------|
| EU AI Act | Disclose AI-generated content, chatbots must identify as AI, deep fakes must be labelled |
| OECD Principles | Transparency & explainability as a core principle |
| G7 Code | Labelling AI-generated content, watermarking |
| US — NIST AI RMF | Transparency as a core characteristic in "Map" function |
| UNESCO | Right to explanation, algorithmic transparency |`,

      "prohibited uses": `## Prohibited AI Uses: Cross-Framework Comparison

| Framework | What's Prohibited |
|-----------|-----------------|
| EU AI Act | Social scoring, real-time biometric mass surveillance, manipulation exploiting vulnerabilities, AI inferring political/religious beliefs from biometrics, predictive policing |
| China Regulations | Content that subverts state power, fake news, discrimination |
| US (no federal law) | No blanket prohibitions — sector-specific (e.g. FTC on deceptive AI) |
| UNESCO | AI used for mass surveillance without human rights safeguards |`,
    };

    const topicLower = topic.toLowerCase();
    let response = comparisons[topicLower];

    if (!response) {
      // Generic comparison for other topics
      response = `## "${topic}": Cross-Framework Comparison

This topic spans multiple AI governance frameworks. Here's what each major framework addresses:

**EU AI Act:** Search the full text at https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1689

**OECD AI Principles:** https://oecd.ai/en/ai-principles — covers transparency, accountability, robustness, human oversight, and inclusive growth

**G7 Hiroshima Code of Conduct:** 11 principles including risk assessment, content provenance, cybersecurity

**NIST AI RMF:** Govern → Map → Measure → Manage framework applicable to this topic

**UNESCO Recommendation:** Emphasizes human rights, cultural diversity, gender equality

*Tip: Use the \`search_ai_governance\` tool with query "${topic}" to find specific document mentions across databases.*`;
    }

    return {
      content: [{ type: "text", text: response }],
    };
  }
);

// ─── Start server ───────────────────────────────────────────────
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("AI Governance MCP Server running on stdio");
