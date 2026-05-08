#!/usr/bin/env bash
# INTERCONNECT post-deploy smoke test.
#
# Usage:
#   BASE_URL=https://your-deploy.vercel.app CRON_SECRET=xxx ./scripts/smoke-test.sh
#   ./scripts/smoke-test.sh --help
#
# Exit code: 0 if all checks pass, 1 if any check fails.
# Warnings do not affect exit code.
#
# Required env vars:
#   BASE_URL      Deployed origin (e.g. https://interconnect.vercel.app)
#   CRON_SECRET   Vercel cron secret used to authorize /api/v1/*/cron
#                 The deployment registers 3 crons (Phase 5):
#                   - /api/v1/calendar/cron   (every 15min)
#                   - /api/v1/jobs/cron       (every 5min, ingest queue drain)
#                   - /api/v1/retention/cron  (daily 18:00 UTC)
#                 All three are validated when CRON_SECRET is provided.
#
# Optional env vars:
#   SKIP_CRON=1   Skip cron-auth checks for ALL three cron endpoints
#                 (calendar / jobs / retention). Use when CRON_SECRET is
#                 unavailable in the local shell (e.g. preview-only secrets).

set -u

# ---------- color helpers ----------
if [[ -t 1 ]]; then
  C_RED=$'\033[31m'
  C_GREEN=$'\033[32m'
  C_YELLOW=$'\033[33m'
  C_DIM=$'\033[2m'
  C_RESET=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_DIM=""; C_RESET=""
fi

PASSED=0
FAILED=0
WARNED=0

pass() { echo "${C_GREEN}[PASS]${C_RESET} $1"; PASSED=$((PASSED+1)); }
fail() { echo "${C_RED}[FAIL]${C_RESET} $1"; FAILED=$((FAILED+1)); }
warn() { echo "${C_YELLOW}[WARN]${C_RESET} $1"; WARNED=$((WARNED+1)); }
info() { echo "${C_DIM}       $1${C_RESET}"; }

# ---------- usage / help ----------
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'
  exit 0
fi

# ---------- A. env var prerequisites ----------
echo "=== A. Environment variables ==="
: "${BASE_URL:?must set BASE_URL (e.g. https://your-deploy.vercel.app)}"
BASE_URL="${BASE_URL%/}" # strip trailing slash
pass "BASE_URL is set: ${BASE_URL}"

if [[ -z "${CRON_SECRET:-}" ]]; then
  if [[ "${SKIP_CRON:-0}" == "1" ]]; then
    warn "CRON_SECRET not set; skipping cron-auth checks (SKIP_CRON=1)"
  else
    : "${CRON_SECRET:?must set CRON_SECRET (or SKIP_CRON=1 to skip cron checks)}"
  fi
else
  pass "CRON_SECRET is set (length=${#CRON_SECRET})"
fi

for opt in SUPABASE_URL SUPABASE_SERVICE_KEY GOOGLE_CLIENT_ID MICROSOFT_CLIENT_ID ZOOM_WEBHOOK_SECRET; do
  if [[ -z "${!opt:-}" ]]; then
    warn "${opt} not set in this shell (only required for Supabase / OAuth side checks)"
  fi
done

# ---------- helpers ----------
# Returns the HTTP status code for a GET request.
status() {
  local url="$1"; shift
  curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$@" "$url" || echo "000"
}

# Returns the HTTP status code for a POST request with empty body.
status_post() {
  local url="$1"; shift
  curl -s -o /dev/null -w "%{http_code}" --max-time 15 -X POST -H "Content-Type: application/json" -d '{}' "$@" "$url" || echo "000"
}

# Status, treating any 3xx as the literal redirect code.
status_no_follow() {
  local url="$1"; shift
  curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$@" "$url" || echo "000"
}

assert_status() {
  local label="$1"; local url="$2"; local got="$3"; shift 3
  local expected_csv="$*"
  for code in $expected_csv; do
    if [[ "$got" == "$code" ]]; then
      pass "${label}: ${url} -> ${got}"
      return 0
    fi
  done
  fail "${label}: ${url} -> ${got} (expected: ${expected_csv})"
  return 1
}

# ---------- B. Public endpoints respond ----------
echo
echo "=== B. Public endpoints ==="
code=$(status "${BASE_URL}/")
assert_status "root" "${BASE_URL}/" "$code" 200 301 302 308

code=$(status "${BASE_URL}/login")
assert_status "login page" "${BASE_URL}/login" "$code" 200 301 302 308

# /api/v1/health: unauthenticated GET; returns 200 + {"status":"ok"} when
# healthy, or 503 + {"status":"degraded"} when env/db checks fail.
health_url="${BASE_URL}/api/v1/health"
health_tmp="$(mktemp -t smoke-health.XXXXXX)"
health_code=$(curl -s -o "${health_tmp}" -w "%{http_code}" --max-time 15 "${health_url}" || echo "000")
health_body=$(cat "${health_tmp}" 2>/dev/null || echo "")
rm -f "${health_tmp}"

if [[ "${health_code}" == "200" ]] && echo "${health_body}" | grep -q '"status"[[:space:]]*:[[:space:]]*"ok"'; then
  pass "health endpoint: ${health_url} -> 200 (status=ok)"
elif [[ "${health_code}" == "503" ]] && echo "${health_body}" | grep -q '"status"[[:space:]]*:[[:space:]]*"degraded"'; then
  warn "health endpoint: ${health_url} -> 503 (status=degraded; env/db check failing)"
  info "body: ${health_body}"
elif [[ "${health_code}" == "404" ]]; then
  warn "health endpoint: ${health_url} -> 404 (route not deployed yet)"
else
  fail "health endpoint: ${health_url} -> ${health_code} (expected 200/ok or 503/degraded)"
  info "body: ${health_body}"
fi

# ---------- C. Auth boundary (must 401 without token) ----------
echo
echo "=== C. Auth-required endpoints reject anonymous ==="
for path in \
  "/api/v1/calendar/sync" \
  "/api/v1/scheduling/availability" \
  "/api/v1/chat/rooms"
do
  code=$(status "${BASE_URL}${path}")
  assert_status "anon-rejected" "${BASE_URL}${path}" "$code" 401 403
done

# ---------- D. Cron endpoints require CRON_SECRET ----------
echo
echo "=== D. Cron endpoints ==="
if [[ -n "${CRON_SECRET:-}" ]]; then
  # Phase 5: 3 crons registered in vercel.json. All share the same Bearer
  # auth pattern — 401 without the header, 200 with it.
  cron_paths=(
    "/api/v1/calendar/cron"
    "/api/v1/jobs/cron"
    "/api/v1/retention/cron"
  )
  for path in "${cron_paths[@]}"; do
    code=$(status "${BASE_URL}${path}")
    assert_status "cron-no-auth" "${BASE_URL}${path}" "$code" 401 403

    code=$(status "${BASE_URL}${path}" -H "Authorization: Bearer ${CRON_SECRET}")
    assert_status "cron-with-secret" "${BASE_URL}${path}" "$code" 200
  done
else
  warn "Skipping cron-auth checks for all 3 crons (calendar/jobs/retention) — no CRON_SECRET"
fi

# ---------- E. Webhook signature enforcement ----------
echo
echo "=== E. Webhook endpoints reject unsigned bodies ==="
code=$(status_post "${BASE_URL}/api/v1/webhooks/zoom")
# 200 would mean signature check is missing; anything else (400/401/403/422) is fine.
if [[ "$code" == "200" ]]; then
  fail "zoom webhook: ${BASE_URL}/api/v1/webhooks/zoom -> 200 (signature NOT enforced!)"
else
  assert_status "zoom webhook (unsigned)" "${BASE_URL}/api/v1/webhooks/zoom" "$code" 400 401 403 422
fi

# ---------- F. OAuth callbacks must not 5xx without params ----------
echo
echo "=== F. OAuth callback endpoints handle missing params ==="
for path in "/api/v1/calendar/callback" "/api/v1/calendar/microsoft/callback"; do
  code=$(status_no_follow "${BASE_URL}${path}")
  if [[ "$code" =~ ^5 ]]; then
    fail "oauth-callback: ${BASE_URL}${path} -> ${code} (5xx; should be 4xx or redirect)"
  else
    assert_status "oauth-callback" "${BASE_URL}${path}" "$code" 200 301 302 303 307 308 400 401 403 404
  fi
done

# ---------- G. ICS feed token enforcement ----------
echo
echo "=== G. ICS feed requires valid token ==="
code=$(status "${BASE_URL}/api/v1/calendar/feed/invalid-token")
if [[ "$code" =~ ^5 ]]; then
  fail "ics-feed: ${BASE_URL}/api/v1/calendar/feed/invalid-token -> ${code} (crashed)"
else
  assert_status "ics-feed (bad token)" "${BASE_URL}/api/v1/calendar/feed/invalid-token" "$code" 401 403 404 410
fi

# ---------- H. Vercel cron config check ----------
echo
echo "=== H. Vercel cron configuration ==="
if [[ -f "vercel.json" ]]; then
  cron_count=$(grep -c '"path"' vercel.json 2>/dev/null || echo 0)
  if [[ "$cron_count" -ge 3 ]]; then
    pass "vercel.json declares ${cron_count} cron job(s) locally (>=3 expected)"
  else
    warn "vercel.json has ${cron_count} cron entries (expected 3: calendar + jobs + retention)"
  fi
else
  warn "vercel.json not found in cwd; run from repo root to verify cron config"
fi
info "To verify the deployed crons are registered, run:"
info "  vercel project ls --json   # or check the Vercel dashboard -> Project -> Cron Jobs"

# ---------- summary ----------
echo
echo "================================================"
echo "${C_GREEN}${PASSED} PASSED${C_RESET}, ${C_RED}${FAILED} FAILED${C_RESET}, ${C_YELLOW}${WARNED} WARNINGS${C_RESET}"
echo "================================================"

if [[ "$FAILED" -gt 0 ]]; then
  exit 1
fi
exit 0
