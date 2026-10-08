#!/usr/bin/env bash
# USB VMS Drive — install Video Management System on Ubuntu
# Supports detection and recording of up to 24 cameras.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

SKIP_DETECT=false
SKIP_DOCKER_PULL=false
ENV_IN=""

usage() {
  cat <<EOF
Usage: sudo $(basename "$0") [options]

Install VMS (Frigate-based) from this USB drive onto Ubuntu.

Options:
  --env FILE          Use site env file (default: config/vms.env or example)
  --skip-detect       Do not run camera discovery during install
  --skip-pull         Do not docker pull (use already-cached images)
  -h, --help          Show this help

After install:
  UI:        http://<host-ip>:${VMS_HTTP_PORT:-5000}
  Detect:    sudo ${SCRIPT_DIR}/detect-cameras.sh
  Apply:     sudo ${SCRIPT_DIR}/apply-cameras.sh
  Status:    ${SCRIPT_DIR}/status.sh
  Uninstall: sudo ${SCRIPT_DIR}/uninstall.sh
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_IN="$2"; shift 2 ;;
    --skip-detect) SKIP_DETECT=true; shift ;;
    --skip-pull) SKIP_DOCKER_PULL=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

require_root
ubuntu_or_die

VERSION="$(vms_version)"
log "USB VMS Drive installer v${VERSION}"
log "Hard camera limit: ${MAX_CAMERAS_HARD_LIMIT}"

# Resolve env
if [[ -n "${ENV_IN}" ]]; then
  [[ -f "${ENV_IN}" ]] || die "Env file not found: ${ENV_IN}"
  load_env_file "${ENV_IN}"
elif [[ -f "${VMS_ROOT}/config/vms.env" ]]; then
  load_env_file "${VMS_ROOT}/config/vms.env"
else
  log "No config/vms.env — using defaults from example."
  load_env_file "${VMS_ROOT}/config/vms.env.example"
fi

INSTALL_ROOT="${DEFAULT_INSTALL_ROOT}"
mkdir -p "${VMS_DATA_DIR}" "${VMS_CONFIG_DIR}" "${INSTALL_ROOT}/bin"

ensure_host_packages
ensure_docker

# Persist env
ENV_OUT="${INSTALL_ROOT}/vms.env"
cat > "${ENV_OUT}" <<EOF
VMS_SITE_NAME="${VMS_SITE_NAME}"
VMS_TZ="${VMS_TZ}"
VMS_MAX_CAMERAS=${VMS_MAX_CAMERAS}
VMS_DATA_DIR="${VMS_DATA_DIR}"
VMS_CONFIG_DIR="${VMS_CONFIG_DIR}"
VMS_HTTP_PORT=${VMS_HTTP_PORT}
VMS_RTSP_PORT=${VMS_RTSP_PORT}
VMS_WEBRTC_PORT=${VMS_WEBRTC_PORT}
CAMERA_USER="${CAMERA_USER}"
CAMERA_PASSWORD="${CAMERA_PASSWORD}"
RECORD_RETAIN_DAYS=${RECORD_RETAIN_DAYS}
DETECTION_ENABLED=${DETECTION_ENABLED}
EOF
chmod 600 "${ENV_OUT}"

# Compose + helpers
cp -f "${VMS_ROOT}/docker/docker-compose.yml" "${INSTALL_ROOT}/docker-compose.yml"
cp -f "${SCRIPT_DIR}/detect-cameras.sh" "${INSTALL_ROOT}/bin/"
cp -f "${SCRIPT_DIR}/detect_cameras.py" "${INSTALL_ROOT}/bin/"
cp -f "${SCRIPT_DIR}/apply-cameras.sh" "${INSTALL_ROOT}/bin/"
cp -f "${SCRIPT_DIR}/apply_cameras.py" "${INSTALL_ROOT}/bin/"
cp -f "${SCRIPT_DIR}/status.sh" "${INSTALL_ROOT}/bin/"
cp -f "${SCRIPT_DIR}/lib.sh" "${INSTALL_ROOT}/bin/"
chmod +x "${INSTALL_ROOT}/bin/"*.sh

# Frigate config from template if missing
FRIGATE_CFG="${VMS_CONFIG_DIR}/config.yml"
if [[ ! -f "${FRIGATE_CFG}" ]]; then
  render_template "${VMS_ROOT}/docker/frigate/config.yml.template" "${FRIGATE_CFG}"
  log "Wrote base Frigate config → ${FRIGATE_CFG}"
fi

# Camera discovery
CAMERAS_YAML="${VMS_CONFIG_DIR}/cameras.yaml"
if [[ "${SKIP_DETECT}" == "false" ]]; then
  log "Running camera discovery (up to ${VMS_MAX_CAMERAS})…"
  VMS_ENV_FILE="${ENV_OUT}" "${SCRIPT_DIR}/detect-cameras.sh" "${CAMERAS_YAML}" || warn "Detection finished with warnings."
else
  if [[ ! -f "${CAMERAS_YAML}" ]]; then
    cp -f "${VMS_ROOT}/config/cameras.yaml.example" "${CAMERAS_YAML}"
  fi
fi

if [[ -f "${CAMERAS_YAML}" ]]; then
  python3 "${SCRIPT_DIR}/apply_cameras.py" \
    --cameras "${CAMERAS_YAML}" \
    --config "${FRIGATE_CFG}" \
    --max "${VMS_MAX_CAMERAS}" || warn "Could not apply cameras yet (empty inventory is OK)."
fi

# Host README
cat > "${INSTALL_ROOT}/README.txt" <<EOF
VMS — installed from USB VMS Drive v${VERSION}
Site: ${VMS_SITE_NAME}
Max cameras: ${VMS_MAX_CAMERAS}
UI port: ${VMS_HTTP_PORT}
Data: ${VMS_DATA_DIR}
Config: ${VMS_CONFIG_DIR}

Detect cameras:  sudo ${INSTALL_ROOT}/bin/detect-cameras.sh
Apply cameras:   sudo ${INSTALL_ROOT}/bin/apply-cameras.sh
Status:          ${INSTALL_ROOT}/bin/status.sh
EOF

# systemd unit for boot persistence (docker restart policy also covers this)
cat > /etc/systemd/system/vms.service <<EOF
[Unit]
Description=Video Management System
Requires=docker.service
After=docker.service network-online.target
Wants=network-online.target

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=${INSTALL_ROOT}
EnvironmentFile=${ENV_OUT}
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable vms.service

export VMS_CONFIG_DIR VMS_DATA_DIR VMS_HTTP_PORT VMS_RTSP_PORT VMS_WEBRTC_PORT VMS_TZ CAMERA_PASSWORD
cd "${INSTALL_ROOT}"
if [[ "${SKIP_DOCKER_PULL}" == "false" ]]; then
  log "Pulling Frigate image (this may take several minutes)…"
  docker compose pull || warn "Pull failed — will try with local/cache image."
fi
log "Starting VMS stack…"
docker compose up -d

HOST_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
HOST_IP="${HOST_IP:-127.0.0.1}"

log "============================================================"
log " VMS installed successfully (v${VERSION})"
log " Site:          ${VMS_SITE_NAME}"
log " Max cameras:   ${VMS_MAX_CAMERAS}"
log " Web UI:        http://${HOST_IP}:${VMS_HTTP_PORT}"
log " Config:        ${VMS_CONFIG_DIR}"
log " Recordings:    ${VMS_DATA_DIR}"
log " Detect again:  sudo ${INSTALL_ROOT}/bin/detect-cameras.sh"
log "============================================================"
