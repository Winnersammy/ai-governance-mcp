# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 2.x     | ✅ Active |
| < 2.0   | ❌ No longer supported |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, **please do not open a public GitHub issue**.

Instead, email the maintainers directly:

**Email:** hello@theailyceum.com  
**Subject line:** `[SECURITY] ai-governance-mcp — <brief description>`

### What to include

- A description of the vulnerability and its potential impact
- Steps to reproduce or a proof-of-concept (if safe to share)
- The version(s) affected
- Any suggested remediation, if known

### Response timeline

- **Acknowledgement:** within 3 business days
- **Status update:** within 7 business days
- **Patch or mitigation:** timeline communicated after initial triage

We appreciate responsible disclosure and will credit reporters in the release notes unless you request anonymity.

## Scope

This project is an MCP server that fetches publicly available AI governance documents from external APIs (EUR-Lex, Federal Register, OECD, RSS feeds). Key considerations:

- **No authentication credentials** are stored or transmitted by this server
- **User feedback** submitted via `submit_mcp_feedback` is written locally to `logs/mcp-feedback.jsonl` and never sent to a remote endpoint
- **CORS is open (`*`)** by design for broad MCP client compatibility — consider restricting this in private deployments
- **No user data** is persisted beyond the local in-memory cache (cleared on restart) and optional local feedback logs

## Out of scope

- Vulnerabilities in third-party data sources (EUR-Lex, Federal Register, etc.)
- Issues that require physical access to a running server
- Social engineering attacks
