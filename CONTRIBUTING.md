# Contributing to AI Governance MCP

Thanks for improving AI Governance MCP.

## Development setup

```bash
git clone https://github.com/Samrajtheailyceum/ai-governance-mcp.git
cd ai-governance-mcp
npm install
```

## Local run modes

- **stdio mode** (default):
  ```bash
  npm start
  ```
- **HTTP/SSE mode**:
  ```bash
  npm run start:sse
  ```

## Testing requirements before PR

Run all checks below before opening a PR:

```bash
npm test
npm run test:terminal
```

Expected behavior:
- Tests may print 403/network errors for external providers (EUR-Lex/Federal Register/OECD) in restricted environments.
- The suite should still pass due to fallback/offline behavior.

## Coding guidelines

- Keep MCP tool output structured and explicit.
- Preserve source provenance fields (`source`, `region`, `retrievalMode`) whenever possible.
- Keep responses concise-but-actionable in `compact` mode and fuller in `detailed` mode.
- Avoid breaking existing tool names/argument schemas unless versioning and README docs are updated.
- Add or update tests in `test/client.js` for behavior changes.

## Documentation checklist

If you add or change tools/features, update:
- `README.md` (tool table + usage examples)
- `src/index.js` tool descriptions and output formatting
- `src/sources.js` source/reference matrix if source coverage changed
- `CHANGELOG.md`

## Maintainer release workflow

For maintainers publishing updates to GitHub:

```bash
git checkout -b feature/my-change
# ... make changes ...
npm test
npm run test:terminal
git add .
git commit -m "feat: describe your change"
git push origin feature/my-change
# Open a PR — include motivation, behavior changes, and test evidence
```

If you use this repo with automated agents, ensure each change includes:
- updated docs (when behavior changes),
- test evidence (`npm test`, `npm run test:terminal`),
- a clear PR summary of motivation + implementation + validation.

## Release checklist

1. Update README and changelog.
2. Run full tests.
3. Verify SSE health endpoint:
   ```bash
   npm run test:terminal
   ```
4. Ensure PR summary includes motivation, behavior changes, and test evidence.
