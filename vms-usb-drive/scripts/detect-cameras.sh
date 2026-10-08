#!/usr/bin/env bash
# Discover up to 24 ONVIF/RTSP cameras and write cameras.yaml
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

ENV_FILE="${VMS_ENV_FILE:-${VMS_ROOT}/config/vms.env}"
OUT="${1:-${VMS_ROOT}/config/cameras.yaml}"

if [[ -f "${ENV_FILE}" ]]; then
  load_env_file "${ENV_FILE}"
else
  load_env_file "${VMS_ROOT}/config/vms.env.example"
fi

export VMS_MAX_CAMERAS CAMERA_USER CAMERA_PASSWORD
log "Detecting cameras (limit ${VMS_MAX_CAMERAS}) → ${OUT}"
python3 "${SCRIPT_DIR}/detect_cameras.py" \
  --max "${VMS_MAX_CAMERAS}" \
  --user "${CAMERA_USER}" \
  --password "${CAMERA_PASSWORD}" \
  -o "${OUT}"

log "Done. Review ${OUT}, then run apply-cameras.sh or re-run install.sh."
