# AI Governance MCP Server

An MCP server that gives Claude (and any MCP-compatible client) real-time access to AI governance laws, regulations, and policy frameworks from around the world.

## Data Sources

| Region | Source | What's Covered |
|--------|--------|----------------|
| 🇪🇺 EU | EUR-Lex API + RSS | EU AI Act, GDPR, AI regulations |
| 🇺🇸 US | Federal Register API, GovInfo | Executive orders, federal agency rules, AI bills |
| 🌍 Global | OECD, G7, UNESCO, UN | International frameworks and principles |
| 📰 News | Stanford HAI, AI Now, FLI | Research & policy news |

## Available Tools

| Tool | Description |
|------|-------------|
| `search_ai_governance` | Full-text search across all databases |
| `get_latest_ai_governance_updates` | Latest updates from RSS feeds |
| `get_key_ai_governance_documents` | Curated list of landmark documents |
| `get_eu_ai_act_info` | EU AI Act deep dive with topic search |
| `get_us_ai_policy` | US policy landscape with Federal Register search |
| `get_global_ai_frameworks` | OECD, G7, UN, UNESCO, Bletchley and more |
| `fetch_governance_document` | Fetch and extract text from any document URL |
| `compare_ai_governance_frameworks` | Side-by-side comparison on a specific topic |

## Installation

```bash
# Clone / copy the project
cd ai-governance-mcp
npm install
```

## Testing

```bash
npm test
```

## Running as MCP Server

```bash
npm start
# or directly:
node src/index.js
```

## Adding to Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-governance": {
      "command": "node",
      "args": ["/absolute/path/to/ai-governance-mcp/src/index.js"]
    }
  }
}
```

Config file locations:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

## Example Prompts After Installation

Once connected to Claude Desktop, you can ask:

- *"What are the latest AI governance updates from the EU?"*
- *"Search for AI liability regulations"*
- *"Compare how the EU and US handle foundation model requirements"*
- *"Give me a summary of the EU AI Act's prohibited practices"*
- *"Fetch the NIST AI Risk Management Framework"*
- *"What US executive orders on AI are currently active?"*

## Architecture

```
src/
├── index.js      — MCP server + all 8 tool definitions
├── fetcher.js    — Data fetching (EUR-Lex, Fed Register, RSS, scraping)
└── sources.js    — Source configuration (URLs, key docs, feeds)

test/
└── client.js     — End-to-end test suite
```

## Caching

All API responses are cached in-memory for 30 minutes to avoid rate limiting and improve response speed.

## Adding New Sources

Edit `src/sources.js` to add new data sources, then add corresponding fetch logic in `src/fetcher.js`.
