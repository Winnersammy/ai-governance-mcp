# Changelog

All notable changes to this project are documented here.

## [2.0.0]

### Added
- Sustainability-focused regulatory briefing tool: `get_sustainability_ai_regulatory_briefing`.
- Applied framework tool: `get_applied_ai_governance_frameworks` with contextual `whyItApplies` and implementation checklists.
- Feedback ingestion tool: `submit_mcp_feedback` for maintainers (`logs/mcp-feedback.jsonl`).
- Terminal smoke test script (`scripts/terminal-smoke.sh`) and `npm run test:terminal`.
- Expanded reference/source coverage: CSRD, CSDDD, SEC climate disclosure rule, ISSB S1/S2, UNESCO recommendation.

### Changed
- More robust retrieval with retries, deduplication, fallback search paths, and offline-cache behavior.
- Improved ranking with relevance + specificity scoring and region inference.
- More explicit/professional response protocol blocks in output to guide downstream LLMs.
- Search/update responses support richer `detailed` output, actionable steps, and provenance metadata.

### Reliability
- Full test suite and terminal smoke checks validate behavior even when live providers intermittently fail.
