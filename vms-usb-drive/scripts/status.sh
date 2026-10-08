#!/usr/bin/env bash
# Show VMS status, camera count, and UI URL.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

INSTALL_ROOT="${DEFAULT_INSTALL_ROOT}"
ENV_FILE="${INSTALL_ROOT}/vms.env"
if [[ -f "${ENV_FILE}" ]]; then
  load_env_file "${ENV_FILE}"
elif [[ -f "${VMS_ROOT}/config/vms.env" ]]; then
  load_env_file "${VMS_ROOT}/config/vms.env"
else
  load_env_file "${VMS_ROOT}/config/vms.env.example"
fi

HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
HOST_IP="${HOST_IP:-127.0.0.1}"

echo "VMS status"
echo "  version:     $(vms_version)"
echo "  site:        ${VMS_SITE_NAME}"
echo "  max cameras: ${VMS_MAX_CAMERAS}"
echo "  ui:          http://${HOST_IP}:${VMS_HTTP_PORT}"
echo "  config:      ${VMS_CONFIG_DIR}"
echo "  data:        ${VMS_DATA_DIR}"

if have_cmd docker; then
  echo "  container:"
  docker ps --filter name=vms --format '    {{.Names}}  {{.Status}}  {{.Ports}}' || true
fi

CAMERAS_YAML="${VMS_CONFIG_DIR}/cameras.yaml"
if [[ -f "${CAMERAS_YAML}" ]]; then
  COUNT="$(python3 - <<PY
import yaml
from pathlib import Path
data = yaml.safe_load(Path("${CAMERAS_YAML}").read_text()) or {}
cams = data.get("cameras") or []
print(sum(1 for c in cams if c and c.get("enabled", True)))
PY
)"
  echo "  cameras:     ${COUNT} / ${VMS_MAX_CAMERAS} enabled in inventory"
elif [[ -f "${VMS_CONFIG_DIR}/config.yml" ]]; then
  COUNT="$(python3 - <<PY
import yaml
from pathlib import Path
data = yaml.safe_load(Path("${VMS_CONFIG_DIR}/config.yml").read_text()) or {}
print(len(data.get("cameras") or {}))
PY
)"
  echo "  cameras:     ${COUNT} configured in Frigate"
else
  echo "  cameras:     (not installed yet)"
fi

if systemctl is-enabled vms.service >/dev/null 2>&1; then
  echo "  systemd:     enabled ($(systemctl is-active vms.service 2>/dev/null || echo unknown))"
fi
