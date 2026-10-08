#!/usr/bin/env bash
# Remove NVSSMD VMS services (keeps recordings unless --purge).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

PURGE=false
[[ "${1:-}" == "--purge" ]] && PURGE=true

require_root

INSTALL_ROOT="${DEFAULT_INSTALL_ROOT}"
ENV_FILE="${INSTALL_ROOT}/vms.env"
if [[ -f "${ENV_FILE}" ]]; then
  load_env_file "${ENV_FILE}"
else
  load_env_file "${VMS_ROOT}/config/vms.env.example"
fi

log "Stopping NVSSMD VMS…"
systemctl disable --now nvssmd-vms.service 2>/dev/null || true
rm -f /etc/systemd/system/nvssmd-vms.service
systemctl daemon-reload

if [[ -f "${INSTALL_ROOT}/docker-compose.yml" ]] && have_cmd docker; then
  (cd "${INSTALL_ROOT}" && docker compose down --remove-orphans) || true
fi

if [[ "${PURGE}" == "true" ]]; then
  warn "Purging config and recordings under ${INSTALL_ROOT}, ${VMS_DATA_DIR}, ${VMS_CONFIG_DIR}"
  rm -rf "${INSTALL_ROOT}" "${VMS_DATA_DIR}" "${VMS_CONFIG_DIR}"
else
  log "Left data/config in place. Re-run with --purge to delete recordings."
  rm -rf "${INSTALL_ROOT}/bin" "${INSTALL_ROOT}/docker-compose.yml" "${INSTALL_ROOT}/README.txt" 2>/dev/null || true
fi

log "Uninstall complete."
