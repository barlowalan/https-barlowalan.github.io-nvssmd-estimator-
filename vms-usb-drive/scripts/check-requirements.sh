#!/usr/bin/env bash
# Pre-flight checks for Ubuntu VMS host (no root required for most checks).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

load_env_file "${VMS_ROOT}/config/vms.env.example"
PASS=0
FAIL=0

ok()   { echo "  OK  $*"; PASS=$((PASS + 1)); }
bad()  { echo "  FAIL $*"; FAIL=$((FAIL + 1)); }
info() { echo "  --  $*"; }

echo "NVSSMD USB VMS Drive — requirements check"
echo "  package version: $(vms_version)"
echo "  camera limit:    ${MAX_CAMERAS_HARD_LIMIT}"

if [[ -f /etc/os-release ]]; then
  # shellcheck disable=SC1091
  source /etc/os-release
  case "${ID}:${VERSION_ID}" in
    ubuntu:20.*|ubuntu:22.*|ubuntu:24.*) ok "OS ${PRETTY_NAME}" ;;
    *) bad "OS ${PRETTY_NAME:-unknown} (want Ubuntu 20.04/22.04/24.04)" ;;
  esac
else
  bad "Missing /etc/os-release"
fi

ARCH="$(uname -m)"
case "${ARCH}" in
  x86_64|amd64|aarch64|arm64) ok "Architecture ${ARCH}" ;;
  *) bad "Architecture ${ARCH} not supported" ;;
esac

MEM_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
MEM_GB=$((MEM_KB / 1024 / 1024))
if (( MEM_GB >= 8 )); then
  ok "RAM ${MEM_GB} GB (recommended ≥8 GB for up to 24 cameras)"
elif (( MEM_GB >= 4 )); then
  info "RAM ${MEM_GB} GB — OK for light loads; 8+ GB recommended for 24 cameras"
  PASS=$((PASS + 1))
else
  bad "RAM ${MEM_GB} GB (need ≥4 GB)"
fi

if have_cmd docker; then
  ok "docker present ($(docker --version 2>/dev/null | head -1))"
else
  info "docker not installed yet (install.sh will add it)"
  PASS=$((PASS + 1))
fi

for cmd in python3 curl; do
  if have_cmd "${cmd}"; then ok "${cmd}"; else bad "missing ${cmd}"; fi
done
# iproute2 is installed by install.sh when missing
if have_cmd ip; then
  ok "ip (iproute2)"
else
  info "ip not present yet (install.sh installs iproute2)"
  PASS=$((PASS + 1))
fi

FREE_KB="$(df -Pk / | awk 'NR==2 {print $4}')"
FREE_GB=$((FREE_KB / 1024 / 1024))
if (( FREE_GB >= 50 )); then
  ok "Free disk ${FREE_GB} GB on / (≥50 GB recommended)"
elif (( FREE_GB >= 20 )); then
  info "Free disk ${FREE_GB} GB — workable; expand storage for retention"
  PASS=$((PASS + 1))
else
  bad "Free disk ${FREE_GB} GB (need ≥20 GB)"
fi

echo
echo "Result: ${PASS} checks OK, ${FAIL} failed"
(( FAIL == 0 ))
