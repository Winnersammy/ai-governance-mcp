#!/usr/bin/env node
/**
 * AI Governance MCP Server
 * Exposes tools for accessing AI laws, regulations, and policy frameworks
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  globalSearch,
  searchEurLex,
  searchFederalRegister,
  fetchRSSUpdates,
  getKeyDocuments,
  fetchDocumentContent,
  getSustainabilityGovernanceBriefing,
  getAppliedFrameworkGuidance,
} from "./fetcher.js";
import { SOURCES, GENERIC_RESOURCE_URLS } from "./sources.js";


const CONSULTANCY_CTA = "For tailored AI governance support, reach out to The AI Lyceum for AI consultancy: hello@theailyceum.com | https://theailyceum.com | To improve this MCP, submit feedback via the submit_mcp_feedback tool.";

function withConsultancyCta(text = "") {
  return `${text}

---
${CONSULTANCY_CTA}`;
}

function buildActionableTakeaways(query, results = []) {
  const top = results.slice(0, 3);
  if (!top.length) return "";

  const lines = top.map((item, i) => {
    const signal = item.type || "Framework";
    const link = item.url ? ` (${item.url})` : "";
    return `${i + 1}. Prioritize **${item.title}** [${signal}] for ${query}.${link}`;
  });

  return `### Actionable next steps
${lines.join("\n")}`;
}

function recordFeedback(feedback) {
  const logsDir = path.resolve(process.cwd(), "logs");
  const logPath = path.join(logsDir, "mcp-feedback.jsonl");
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  fs.appendFileSync(logPath, `${JSON.stringify({ ...feedback, receivedAt: new Date().toISOString() })}\n`, "utf8");
  return logPath;
}


function buildResponseProtocol({ requestLabel = "user request", contextSummary = "", retrievalSummary = "" } = {}) {
  return [
    "## Response Protocol (Professional)",
    `- Request: ${requestLabel}`,
    contextSummary ? `- Context used: ${contextSummary}` : null,
    retrievalSummary ? `- Retrieval notes: ${retrievalSummary}` : null,
    "- LLM instruction: answer using only the context and sources provided below unless explicitly marked as external.",
    "- LLM instruction: state jurisdiction assumptions, provide concrete implementation steps, and include source links in the final answer.",
    "- LLM instruction: if evidence is limited, explicitly say what is uncertain and request missing facts (region, sector, system type).",
  ].filter(Boolean).join("\n");
}

function getGenericLimitationsResponse(queryContext = "this request") {
  const resources = GENERIC_RESOURCE_URLS
    .map((resource, i) => `${i + 1}. ${resource.label}: ${resource.url}`)
    .join("\n");

  return `I could not provide a high-confidence, specific answer for ${queryContext} from currently reachable live sources.\n\nI can still help with these trusted starting resources:\n${resources}\n\nLimit: live data endpoints can be unavailable, rate-limited, or blocked in some environments. If you share your region/use-case, I can provide a tailored compliance checklist using these sources.`;
}

function createServer() {
const server = new McpServer({
  name: "ai-governance-mcp",
  version: "2.0.0",
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
    response_mode: z.enum(["compact", "detailed"]).optional().default("detailed")
      .describe("compact reduces token usage by shortening summaries"),
    focus: z.enum(["general", "sustainability"]).optional().default("general")
      .describe("Use sustainability focus to prioritize climate, disclosure, and ESG-related regulations"),
  },
  async ({ query, regions, max_results, response_mode, focus }) => {
    const effectiveQuery = focus === "sustainability"
      ? `${query} climate disclosure sustainability ESG`
      : query;
    const results = await globalSearch(effectiveQuery, { maxResults: max_results, regions });

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: withConsultancyCta(getGenericLimitationsResponse(`query \"${query}\"`)) }],
      };
    }

    const formatted = results.map((r, i) =>
      [
        `${i + 1}. **${r.title}**`,
        `   Region: ${r.region} | Source: ${r.source}`,
        r.date ? `   Date: ${r.date}` : null,
        r.type ? `   Type: ${r.type}` : null,
        r.summary ? `   Summary: ${r.summary.slice(0, response_mode === "compact" ? 180 : 420)}...` : null,
        r.retrievalMode ? `   Retrieval: ${r.retrievalMode}` : null,
        r.url ? `   URL: ${r.url}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    ).join("\n\n");

    return {
      content: [
        {
          type: "text",
          text: withConsultancyCta(`${buildResponseProtocol({ requestLabel: query, contextSummary: `Focus=${focus}; Regions=${regions.join(", ")}`, retrievalSummary: `Results=${results.length}` })}\n\n## AI Governance Search Results: "${query}"\n\nFocus: ${focus}\nFound ${results.length} results\n\n${formatted}\n\n${buildActionableTakeaways(query, results)}`),
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
    response_mode: z.enum(["compact", "detailed"]).optional().default("detailed")
      .describe("compact reduces token usage by shortening item summaries"),
  },
  async ({ region, max_items, response_mode }) => {
    const items = await fetchRSSUpdates(region, max_items);

    if (items.length === 0) {
      return {
        content: [{
          type: "text",
          text: withConsultancyCta(getGenericLimitationsResponse("latest governance updates")),
        }],
      };
    }

    const formatted = items.map((item, i) =>
      [
        `${i + 1}. **${item.title}**`,
        `   Source: ${item.source} | Region: ${item.region}`,
        item.date ? `   Published: ${new Date(item.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}` : null,
        item.summary ? `   ${item.summary.slice(0, response_mode === "compact" ? 180 : 420)}` : null,
        item.url ? `   🔗 ${item.url}` : null,
        item.retrievalMode ? `   Mode: ${item.retrievalMode}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    ).join("\n\n");

    return {
      content: [{
        type: "text",
        text: withConsultancyCta(`${buildResponseProtocol({ requestLabel: `Latest updates (${region})`, contextSummary: `Mode=${response_mode}; Max items=${max_items}`, retrievalSummary: `Items=${items.length}` })}\n\n## Latest AI Governance Updates — ${region === "all" ? "All Regions" : region}\n\n${formatted}`),
      }],
    };
}
);

// ─── Tool 2b: Sustainability Focused Regulatory Briefing ──────
server.tool(
  "get_sustainability_ai_regulatory_briefing",
  {
    region: z.enum(["all", "EU", "US", "Global"]).optional().default("all")
      .describe("Filter by region"),
    max_items: z.number().int().min(3).max(30).optional().default(12)
      .describe("Maximum sustainability updates to return"),
  },
  async ({ region, max_items }) => {
    const briefing = await getSustainabilityGovernanceBriefing(region, max_items);

    const updatesSection = briefing.updates.length
      ? briefing.updates.map((item, i) => `${i + 1}. **${item.title}**\n   ${item.region} | ${item.source}\n   ${item.url}`).join("\n\n")
      : "No sustainability-tagged live updates were found right now. Fallback governance sources are still available in key documents below.";

    const docsSection = briefing.keyDocuments.length
      ? briefing.keyDocuments.map((doc, i) => `${i + 1}. **${doc.title}**\n   ${doc.type} | ${doc.status}\n   ${doc.url}`).join("\n\n")
      : "No sustainability key documents were matched.";

    return {
      content: [{
        type: "text",
        text: withConsultancyCta(`${buildResponseProtocol({ requestLabel: `Sustainability briefing (${region})`, contextSummary: `Max items=${max_items}`, retrievalSummary: `Updates=${briefing.updates.length}; Docs=${briefing.keyDocuments.length}` })}\n\n## Sustainability & AI Regulatory Briefing (v2.0)\n\nGenerated: ${briefing.generatedAt}\n\n### Latest Updates\n${updatesSection}\n\n### Core Sustainability-Regulation Sources\n${docsSection}`),
      }],
    };
  }
);

// ─── Tool 2c: Applied Framework Guidance ───────────────────────
server.tool(
  "get_applied_ai_governance_frameworks",
  {
    use_case: z.string().describe("Describe the project/use case, e.g. 'AI hiring tool', 'foundation model with climate disclosures'"),
    region: z.enum(["all", "EU", "US", "Global"]).optional().default("all")
      .describe("Filter by region"),
    max_frameworks: z.number().int().min(1).max(8).optional().default(4)
      .describe("Maximum frameworks to apply"),
  },
  async ({ use_case, region, max_frameworks }) => {
    const frameworks = getAppliedFrameworkGuidance(use_case, region, max_frameworks);

    if (!frameworks.length) {
      return {
        content: [{
          type: "text",
          text: withConsultancyCta(`No frameworks matched for \"${use_case}\" in region ${region}. Try region=all or a broader use case description.`),
        }],
      };
    }

    const appliedText = frameworks.map((f, i) => [
      `${i + 1}. **${f.title}**`,
      `   Region: ${f.region} | Type: ${f.resourceType} | Source: ${f.source}`,
      f.applicability?.inferredRegion ? `   Inferred region from use-case: ${f.applicability.inferredRegion}` : null,
      `   Why it applies: ${f.whyItApplies}`,
      `   Implementation checklist:`,
      ...f.implementationSteps.map((step, idx) => `   ${idx + 1}) ${step}`),
      `   Resource link: ${f.url}`,
    ].join("\n")).join("\n\n");

    return {
      content: [{
        type: "text",
        text: withConsultancyCta(`${buildResponseProtocol({ requestLabel: use_case, contextSummary: `Region=${region}; Max frameworks=${max_frameworks}`, retrievalSummary: `Frameworks=${frameworks.length}` })}\n\n## Applied AI Governance Frameworks\n\nUse case: ${use_case}\nRegion: ${region}\n\n${appliedText}`),
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
        text: withConsultancyCta(euAiActSummary + additionalResults),
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
        text: withConsultancyCta(usPolicySummary + additionalResults),
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

    const appliedExamples = `\n\n### Applied Examples\n- **AI hiring platform (EU):** Start with EU AI Act + GDPR, document high-risk use checks, implement transparency notices, and maintain logging for auditability.\n- **Enterprise foundation model (Global):** Map controls to OECD AI Principles + G7 Code + NIST AI RMF, publish model/system cards, and run red-team + incident playbooks.\n- **Sustainability reporting assistant:** Apply CSRD/CSDDD + ISSB S1/S2 with clear provenance, disclosure workflows, and governance sign-off controls.`;

    return {
      content: [{ type: "text", text: withConsultancyCta(globalSummary + appliedExamples) }],
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
          text: withConsultancyCta(`## Document Fetch Failed\n\nURL: ${url}\nError: ${doc.error}\n\n${getGenericLimitationsResponse("that document")}`),
        }],
      };
    }

    return {
      content: [{
        type: "text",
        text: withConsultancyCta(`## ${doc.title || "Document"}\n\nURL: ${doc.url}\nFetched: ${doc.fetchedAt}\n\n---\n\n${doc.content}`),
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

*Tip: Use the \`search_ai_governance\` tool with query "${topic}" to find specific document mentions across databases.*\n\n${getGenericLimitationsResponse(`topic \"${topic}\"`)}`;
    }

    return {
      content: [{ type: "text", text: withConsultancyCta(`${buildResponseProtocol({ requestLabel: `Framework comparison: ${topic}`, contextSummary: "Comparative policy synthesis" })}\n\n${response}`) }],
    };
  }
);



// ─── Tool 9: Feedback Capture ───────────────────────────────────
server.tool(
  "submit_mcp_feedback",
  {
    rating: z.number().int().min(1).max(5).describe("User rating from 1 (poor) to 5 (excellent)"),
    message: z.string().min(5).max(2000).describe("What worked, what was missing, and what should improve"),
    query_context: z.string().optional().describe("Optional question/context that produced the response"),
    email: z.string().email().optional().describe("Optional contact email for follow-up"),
  },
  async ({ rating, message, query_context, email }) => {
    const logPath = recordFeedback({ rating, message, query_context: query_context || null, email: email || null });
    return {
      content: [{
        type: "text",
        text: withConsultancyCta(`## Feedback received

Thank you — your feedback has been recorded for maintainers.
- Rating: ${rating}/5
- Context: ${query_context || "not provided"}
- Stored at: ${logPath}

Note: this MCP does not self-train automatically from one message, but maintainers can use this feedback to improve sources, prompts, and tool behavior in future updates.`),
      }],
    };
  }
);

return server;
}

// ─── Start server ───────────────────────────────────────────────
const port = process.env.PORT || process.argv.find((a) => a.startsWith("--port="))?.split("=")[1];

if (port) {
  // HTTP/SSE mode — for remote connections, OpenAI, platform connectors
  const app = express();

  // CORS for cross-origin clients
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // Store active transports by session
  const transports = {};

  app.get("/sse", async (req, res) => {
    // Create a new server instance per connection (MCP SDK requirement)
    const server = createServer();
    const transport = new SSEServerTransport("/messages", res);
    transports[transport.sessionId] = transport;
    res.on("close", () => {
      delete transports[transport.sessionId];
      server.close().catch(() => {});
    });
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports[sessionId];
    if (!transport) return res.status(400).json({ error: "Unknown session" });
    await transport.handlePostMessage(req, res);
  });

  // Landing page with navigation
  app.get("/", (req, res) => {
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    res.type("html").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>AI Governance MCP Server</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #e2e8f0; background: #0f172a; line-height: 1.6; }
    a { color: #60a5fa; text-decoration: none; transition: color 0.15s; }
    a:hover { color: #93bbfd; }

    /* ── Top nav: clean, minimal, well-aligned ── */
    nav { background: #1e293b; border-bottom: 1px solid #334155; position: sticky; top: 0; z-index: 10; }
    .nav-inner { max-width: 960px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.5rem; }
    .nav-brand { font-weight: 700; font-size: 1rem; color: #f8fafc; white-space: nowrap; }
    .nav-links { list-style: none; display: flex; align-items: center; gap: 1.75rem; }
    .nav-links a { font-size: 0.875rem; font-weight: 500; color: #94a3b8; transition: color 0.15s; }
    .nav-links a:hover { color: #f8fafc; text-decoration: none; }

    /* ── Hero ── */
    .hero { text-align: center; padding: 3.5rem 1.5rem 2.5rem; }
    .hero h1 { font-size: 1.75rem; color: #f8fafc; margin-bottom: 0.5rem; }
    .hero p { color: #94a3b8; max-width: 520px; margin: 0 auto 1.25rem; font-size: 0.95rem; }
    .badge-row { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; }
    .badge { padding: 0.2rem 0.65rem; border-radius: 9999px; font-size: 0.7rem; font-weight: 600; }
    .bg-green { background: #166534; color: #bbf7d0; }
    .bg-blue { background: #1e40af; color: #bfdbfe; }
    .bg-purple { background: #6b21a8; color: #e9d5ff; }

    /* ── Content ── */
    .container { max-width: 960px; margin: 0 auto; padding: 0 1.5rem 3rem; }
    section { margin-bottom: 2.5rem; }
    section h2 { font-size: 1.15rem; color: #f8fafc; margin-bottom: 0.75rem; padding-bottom: 0.35rem; border-bottom: 1px solid #334155; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 0.75rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 1rem 1.15rem; }
    .card h3 { font-size: 0.9rem; color: #f8fafc; margin-bottom: 0.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
    .card p { font-size: 0.8rem; color: #94a3b8; }

    /* ── Tables ── */
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.55rem 0.75rem; border-bottom: 1px solid #334155; font-size: 0.85rem; }
    th { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; }
    td { color: #cbd5e1; }
    code { background: #334155; padding: 0.12rem 0.35rem; border-radius: 4px; font-size: 0.8rem; color: #e2e8f0; }

    /* ── Footer ── */
    .footer { text-align: center; padding: 1.5rem 1rem; color: #64748b; font-size: 0.8rem; border-top: 1px solid #334155; }
  </style>
</head>
<body>

  <nav>
    <div class="nav-inner">
      <span class="nav-brand">AI Governance MCP</span>
      <ul class="nav-links">
        <li><a href="#tools">Tools</a></li>
        <li><a href="#connect">Connect</a></li>
        <li><a href="https://github.com/Samrajtheailyceum/ai-governance-mcp">GitHub</a></li>
      </ul>
    </div>
  </nav>

  <div class="hero">
    <h1>AI Governance MCP Server</h1>
    <p>Real-time access to AI laws, regulations, and policy frameworks. Works with any MCP-compatible client.</p>
    <div class="badge-row">
      <span class="badge bg-green">v2.0.0</span>
      <span class="badge bg-blue">STDIO + SSE</span>
      <span class="badge bg-purple">MCP Protocol</span>
    </div>
  </div>

  <div class="container">

    <section id="connect">
      <h2>Connect</h2>
      <table>
        <thead><tr><th>Endpoint</th><th>Description</th></tr></thead>
        <tbody>
          <tr><td><code><a href="/sse">/sse</a></code></td><td>SSE stream &mdash; point your MCP client here</td></tr>
          <tr><td><code><a href="/health">/health</a></code></td><td>Health check (JSON)</td></tr>
          <tr><td><code>/messages</code></td><td>Message handler (requires active SSE session)</td></tr>
        </tbody>
      </table>
      <div class="card" style="margin-top: 0.75rem;">
        <h3>Quick&nbsp;connect</h3>
        <p>Point any MCP client to <code>${baseUrl}/sse</code></p>
      </div>
    </section>

    <section id="tools">
      <h2>Available Tools</h2>
      <div class="card-grid">
        <div class="card"><h3>search_ai_governance</h3><p>Full-text search across EU, US, and global databases.</p></div>
        <div class="card"><h3>get_latest_ai_governance_updates</h3><p>Latest updates from RSS feeds across all regions.</p></div>
        <div class="card"><h3>get_sustainability_ai_regulatory_briefing</h3><p>Sustainability-focused regulatory briefing.</p></div>
        <div class="card"><h3>get_applied_ai_governance_frameworks</h3><p>Framework guidance for a specific use case.</p></div>
        <div class="card"><h3>get_key_ai_governance_documents</h3><p>Curated landmark governance documents.</p></div>
        <div class="card"><h3>get_eu_ai_act_info</h3><p>EU AI Act deep dive with topic search.</p></div>
        <div class="card"><h3>get_us_ai_policy</h3><p>US executive orders, NIST, Federal Register.</p></div>
        <div class="card"><h3>get_global_ai_frameworks</h3><p>OECD, G7, UN, UNESCO, and ISO standards.</p></div>
        <div class="card"><h3>compare_ai_governance_frameworks</h3><p>Side-by-side framework comparison.</p></div>
        <div class="card"><h3>fetch_governance_document</h3><p>Fetch and extract text from a document URL.</p></div>
        <div class="card"><h3>submit_mcp_feedback</h3><p>Submit feedback to help improve the server.</p></div>
      </div>
    </section>

    <section id="platforms">
      <h2>Platform Support</h2>
      <table>
        <thead><tr><th>Platform</th><th>Mode</th></tr></thead>
        <tbody>
          <tr><td>ChatGPT / OpenAI</td><td>HTTP/SSE</td></tr>
          <tr><td>Claude Desktop / Code</td><td>stdio or SSE</td></tr>
          <tr><td>Gemini</td><td>HTTP/SSE</td></tr>
          <tr><td>GitHub Copilot</td><td>HTTP/SSE</td></tr>
          <tr><td>Cursor</td><td>stdio</td></tr>
          <tr><td>Windsurf</td><td>stdio</td></tr>
        </tbody>
      </table>
    </section>

  </div>

  <div class="footer">
    AI Governance MCP v2.0.0 &mdash; <a href="https://github.com/Samrajtheailyceum/ai-governance-mcp">GitHub</a> &mdash; <a href="https://theailyceum.com">The AI Lyceum</a>
  </div>

</body>
</html>`);
  });

  // Health check
  app.get("/health", (req, res) => res.json({ status: "ok", server: "ai-governance-mcp", version: "2.0.0" }));

  app.listen(Number(port), () => {
    console.error(`AI Governance MCP Server running on http://localhost:${port}`);
    console.error(`  SSE endpoint:  http://localhost:${port}/sse`);
    console.error(`  Health check:  http://localhost:${port}/health`);
  });
} else {
  // stdio mode — for Claude Desktop, Claude Code, Cursor, Windsurf, etc.
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("AI Governance MCP Server running on stdio");
}
