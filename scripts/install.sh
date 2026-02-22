#!/usr/bin/env bash
# =============================================================================
# AI Governance MCP — One-Command Installer
# =============================================================================
# Usage:
#   bash <(curl -fsSL https://raw.githubusercontent.com/Samrajtheailyceum/ai-governance-mcp/main/scripts/install.sh)
#
# Or if you already have the repo cloned:
#   bash scripts/install.sh [--mode stdio|sse|skip]
#
# Flags:
#   --mode stdio   Install then start server in stdio mode
#   --mode sse     Install then start server in HTTP/SSE mode on port 3100
#   --mode skip    Install only, don't start server (default)
#   --dir <path>   Install to a custom directory (default: ~/ai-governance-mcp)
#   --no-test      Skip the post-install smoke test
# =============================================================================
set -euo pipefail

# ── color helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[info]${RESET}  $*"; }
success() { echo -e "${GREEN}[ok]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $*"; }
error()   { echo -e "${RED}[error]${RESET} $*" >&2; exit 1; }

# ── defaults ───────────────────────────────────────────────────────────────
INSTALL_DIR="${HOME}/ai-governance-mcp"
MODE="skip"
RUN_TEST=true
REPO_URL="https://github.com/Samrajtheailyceum/ai-governance-mcp.git"

# ── parse flags ────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --mode)   MODE="$2"; shift 2 ;;
    --dir)    INSTALL_DIR="$2"; shift 2 ;;
    --no-test) RUN_TEST=false; shift ;;
    -h|--help)
      echo "Usage: $0 [--mode stdio|sse|skip] [--dir <path>] [--no-test]"
      exit 0 ;;
    *) warn "Unknown flag: $1"; shift ;;
  esac
done

# ── banner ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║       AI Governance MCP — Installer                      ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${RESET}"
echo ""

# ── prerequisite checks ────────────────────────────────────────────────────
info "Checking prerequisites..."

# Node.js
if ! command -v node &>/dev/null; then
  error "Node.js is not installed. Install Node.js 18+ from https://nodejs.org and re-run."
fi
NODE_VERSION=$(node --version | sed 's/v//')
NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
if [[ "$NODE_MAJOR" -lt 18 ]]; then
  error "Node.js 18+ required. You have v${NODE_VERSION}. Upgrade at https://nodejs.org"
fi
success "Node.js v${NODE_VERSION}"

# npm
if ! command -v npm &>/dev/null; then
  error "npm is not installed. It should come with Node.js — reinstall from https://nodejs.org"
fi
success "npm $(npm --version)"

# git
if ! command -v git &>/dev/null; then
  error "git is not installed. Install from https://git-scm.com"
fi
success "git $(git --version | awk '{print $3}')"

echo ""

# ── clone or update ────────────────────────────────────────────────────────
# Detect if we're already inside the repo (running from scripts/install.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." 2>/dev/null && pwd || echo '')"

if [[ -f "${REPO_ROOT}/package.json" ]] && grep -q '"ai-governance-mcp"' "${REPO_ROOT}/package.json" 2>/dev/null; then
  info "Already inside the repository at ${REPO_ROOT}"
  INSTALL_DIR="$REPO_ROOT"
elif [[ -d "${INSTALL_DIR}/.git" ]]; then
  info "Repository already exists at ${INSTALL_DIR} — pulling latest..."
  git -C "${INSTALL_DIR}" pull --ff-only
  success "Updated to latest"
else
  info "Cloning repository to ${INSTALL_DIR}..."
  git clone "$REPO_URL" "$INSTALL_DIR"
  success "Cloned"
fi

cd "$INSTALL_DIR"

# ── npm install ────────────────────────────────────────────────────────────
info "Installing dependencies..."
npm install --quiet
success "Dependencies installed"
echo ""

# ── smoke test ─────────────────────────────────────────────────────────────
if [[ "$RUN_TEST" == "true" ]]; then
  info "Running post-install smoke test..."
  if bash scripts/terminal-smoke.sh; then
    success "Smoke test passed — server starts and /health responds correctly"
  else
    error "Smoke test failed. Run 'npm run test:terminal' manually to investigate."
  fi
  echo ""
fi

# ── print config snippets ──────────────────────────────────────────────────
ENTRY_POINT="${INSTALL_DIR}/src/index.js"

echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Platform Configuration Snippets${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""

echo -e "${CYAN}▶ Claude Desktop${RESET}  (~/Library/Application Support/Claude/claude_desktop_config.json)"
echo '  Add to "mcpServers":'
cat <<JSON
  {
    "ai-governance": {
      "command": "node",
      "args": ["${ENTRY_POINT}"]
    }
  }
JSON

echo ""
echo -e "${CYAN}▶ Claude Code (CLI)${RESET}"
echo "  claude mcp add ai-governance node ${ENTRY_POINT}"

echo ""
echo -e "${CYAN}▶ Cursor${RESET}  (~/.cursor/mcp.json)"
echo '  Add to "mcpServers":'
cat <<JSON
  {
    "ai-governance": {
      "command": "node",
      "args": ["${ENTRY_POINT}"]
    }
  }
JSON

echo ""
echo -e "${CYAN}▶ Windsurf${RESET}  (~/.codeium/windsurf/mcp_config.json)"
echo '  Add to "mcpServers":'
cat <<JSON
  {
    "ai-governance": {
      "command": "node",
      "args": ["${ENTRY_POINT}"]
    }
  }
JSON

echo ""
echo -e "${CYAN}▶ HTTP/SSE mode${RESET}  (OpenAI / ChatGPT / any remote connector)"
echo "  Start:    cd ${INSTALL_DIR} && npm run start:sse"
echo "  Endpoint: http://localhost:3100/sse"
echo "  Health:   http://localhost:3100/health"

echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════════${RESET}"
echo ""

# ── start server (optional) ────────────────────────────────────────────────
case "$MODE" in
  stdio)
    info "Starting server in stdio mode..."
    echo -e "${YELLOW}Press Ctrl+C to stop.${RESET}"
    echo ""
    exec node src/index.js
    ;;
  sse)
    info "Starting server in HTTP/SSE mode on port 3100..."
    echo -e "${YELLOW}Press Ctrl+C to stop.${RESET}"
    echo ""
    exec env PORT=3100 node src/index.js
    ;;
  skip|*)
    echo -e "${GREEN}✅ Installation complete!${RESET}"
    echo ""
    echo "  Start (stdio):    cd ${INSTALL_DIR} && npm start"
    echo "  Start (HTTP/SSE): cd ${INSTALL_DIR} && npm run start:sse"
    echo "  Run tests:        cd ${INSTALL_DIR} && npm test"
    echo ""
    ;;
esac
