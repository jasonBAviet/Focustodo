#!/usr/bin/env bash
# Deploy focus2 to production SSH server.
# Usage (from project root in Git Bash):
#   bash scripts/deploy.sh
#   bash scripts/deploy.sh --patch src/foo.tsx src/bar.tsx   # patch-deploy chỉ 1 số file

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
SSH_HOST="103.166.182.190"
SSH_PORT="24700"
SSH_USER="root"
REMOTE_DIR="/opt/focus2"
TARBALL="/tmp/focus2-deploy.tgz"
ASKPASS="/tmp/fkask-deploy.sh"

# Files luôn được đưa vào tarball (full deploy)
FULL_TARGETS=(
  src
  server.js
  routes
  db.js
  api
  package.json
  package-lock.json
  scripts
  tsconfig.json
  tsconfig.app.json
  tsconfig.node.json
  vite.config.ts
)

# ── Helpers ───────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $*"; }
error() { echo -e "${RED}[deploy]${NC} $*" >&2; exit 1; }

cleanup() {
  rm -f "$ASKPASS" "$TARBALL"
}
trap cleanup EXIT

# ── Credentials ───────────────────────────────────────────────────────────────
ENV_FILE="$(dirname "$0")/../.env"
[[ -f "$ENV_FILE" ]] || error ".env không tồn tại tại $ENV_FILE"
FK_PW="$(grep -m1 '^SSH_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
[[ -n "$FK_PW" ]] || error "SSH_PASSWORD không tìm thấy trong .env"

printf '%s\n' 'echo "$FK_PW"' > "$ASKPASS"
chmod +x "$ASKPASS"

# ── SSH wrapper ───────────────────────────────────────────────────────────────
run_ssh() {
  FK_PW="$FK_PW" SSH_ASKPASS="$ASKPASS" SSH_ASKPASS_REQUIRE=force DISPLAY=:0 \
    ssh -p "$SSH_PORT" \
        -o PreferredAuthentications=password \
        -o PubkeyAuthentication=no \
        -o StrictHostKeyChecking=accept-new \
        "${SSH_USER}@${SSH_HOST}" "$@" 2>/dev/null
}

run_scp() {
  FK_PW="$FK_PW" SSH_ASKPASS="$ASKPASS" SSH_ASKPASS_REQUIRE=force DISPLAY=:0 \
    scp -P "$SSH_PORT" \
        -o PreferredAuthentications=password \
        -o PubkeyAuthentication=no \
        -o StrictHostKeyChecking=accept-new \
        "$@" 2>/dev/null
}

# ── Determine targets ─────────────────────────────────────────────────────────
PATCH_MODE=false
TARGETS=("${FULL_TARGETS[@]}")

if [[ "${1:-}" == "--patch" ]]; then
  shift
  [[ $# -gt 0 ]] || error "--patch yêu cầu ít nhất 1 file"
  PATCH_MODE=true
  TARGETS=("$@")
  warn "Patch mode: chỉ upload ${TARGETS[*]}"
fi

# ── Create tarball ────────────────────────────────────────────────────────────
info "Tạo tarball từ: ${TARGETS[*]}"
tar -czf "$TARBALL" "${TARGETS[@]}"
TARBALL_SIZE=$(du -sh "$TARBALL" | cut -f1)
info "Tarball: $TARBALL_SIZE"

# ── Upload ────────────────────────────────────────────────────────────────────
info "Upload lên ${SSH_HOST}:${SSH_PORT} ..."
run_scp "$TARBALL" "${SSH_USER}@${SSH_HOST}:/tmp/focus2-deploy.tgz"
info "Upload OK"

# ── Deploy on server ──────────────────────────────────────────────────────────
info "Deploy trên server (build + restart) ..."

if $PATCH_MODE; then
  # Patch: chỉ extract, không xoá src
  REMOTE_CMD="
    cd ${REMOTE_DIR}
    tar -xzf /tmp/focus2-deploy.tgz
    npm run build
    systemctl restart focus2-api.service
    echo DEPLOY_OK
  "
else
  # Full: xoá src cũ trước để tránh file thừa từ refactor
  REMOTE_CMD="
    cd ${REMOTE_DIR}
    rm -rf src
    tar -xzf /tmp/focus2-deploy.tgz
    npm install --prefer-offline
    npm run build
    systemctl restart focus2-api.service
    echo DEPLOY_OK
  "
fi

RESULT=$(run_ssh "$REMOTE_CMD")
echo "$RESULT" | grep -v '^$'

echo "$RESULT" | grep -q "DEPLOY_OK" || error "Deploy thất bại — xem log trên"

# ── Health check ──────────────────────────────────────────────────────────────
info "Health check ..."
sleep 1
HEALTH=$(run_ssh "curl -sf http://localhost:4001/api/health || echo FAIL")
if echo "$HEALTH" | grep -q '"status":"ok"'; then
  info "Health OK: $HEALTH"
else
  warn "Health check trả về: $HEALTH"
fi

info "Deploy hoàn tất."
