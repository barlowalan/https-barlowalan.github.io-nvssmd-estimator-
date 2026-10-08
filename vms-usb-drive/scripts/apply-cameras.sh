#!/usr/bin/env bash
# Merge config/cameras.yaml into the live Frigate config and restart VMS.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

ENV_FILE="${VMS_ENV_FILE:-${DEFAULT_INSTALL_ROOT}/vms.env}"
if [[ ! -f "${ENV_FILE}" ]]; then
  ENV_FILE="${VMS_ROOT}/config/vms.env"
fi
if [[ -f "${ENV_FILE}" ]]; then
  load_env_file "${ENV_FILE}"
else
  load_env_file "${VMS_ROOT}/config/vms.env.example"
fi

CAMERAS_YAML="${1:-${VMS_CONFIG_DIR}/cameras.yaml}"
if [[ ! -f "${CAMERAS_YAML}" ]]; then
  CAMERAS_YAML="${VMS_ROOT}/config/cameras.yaml"
fi
[[ -f "${CAMERAS_YAML}" ]] || die "No cameras.yaml found. Run detect-cameras.sh first."

FRIGATE_CFG="${VMS_CONFIG_DIR}/config.yml"
[[ -f "${FRIGATE_CFG}" ]] || die "Missing Frigate config at ${FRIGATE_CFG}. Run install.sh first."

log "Applying ${CAMERAS_YAML} → ${FRIGATE_CFG}"
python3 "${SCRIPT_DIR}/apply_cameras.py" \
  --cameras "${CAMERAS_YAML}" \
  --config "${FRIGATE_CFG}" \
  --max "${VMS_MAX_CAMERAS}"

COMPOSE_DIR="${DEFAULT_INSTALL_ROOT}"
if [[ -f "${COMPOSE_DIR}/docker-compose.yml" ]] && have_cmd docker; then
  log "Restarting nvssmd-vms…"
  (cd "${COMPOSE_DIR}" && docker compose up -d --force-recreate frigate)
fi

log "Apply complete."
