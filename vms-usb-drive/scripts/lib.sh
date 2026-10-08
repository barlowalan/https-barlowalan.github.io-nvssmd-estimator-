#!/usr/bin/env bash
# Shared helpers for NVSSMD USB VMS Drive scripts.
set -euo pipefail

VMS_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="${VMS_ROOT}/VERSION"
DEFAULT_INSTALL_ROOT="/opt/nvssmd-vms"
MAX_CAMERAS_HARD_LIMIT=24

log()  { printf '[nvssmd-vms] %s\n' "$*"; }
warn() { printf '[nvssmd-vms] WARNING: %s\n' "$*" >&2; }
die()  { printf '[nvssmd-vms] ERROR: %s\n' "$*" >&2; exit 1; }

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    die "Run as root (sudo). Example: sudo $0"
  fi
}

vms_version() {
  if [[ -f "${VERSION_FILE}" ]]; then
    tr -d '[:space:]' < "${VERSION_FILE}"
  else
    echo "0.0.0"
  fi
}

load_env_file() {
  local env_file="${1:-}"
  if [[ -n "${env_file}" && -f "${env_file}" ]]; then
    # shellcheck disable=SC1090
    set -a
    source "${env_file}"
    set +a
  fi
  VMS_SITE_NAME="${VMS_SITE_NAME:-NVSSMD Site}"
  VMS_TZ="${VMS_TZ:-America/New_York}"
  VMS_MAX_CAMERAS="${VMS_MAX_CAMERAS:-24}"
  VMS_DATA_DIR="${VMS_DATA_DIR:-${DEFAULT_INSTALL_ROOT}/data}"
  VMS_CONFIG_DIR="${VMS_CONFIG_DIR:-${DEFAULT_INSTALL_ROOT}/config}"
  VMS_HTTP_PORT="${VMS_HTTP_PORT:-5000}"
  VMS_RTSP_PORT="${VMS_RTSP_PORT:-8554}"
  VMS_WEBRTC_PORT="${VMS_WEBRTC_PORT:-8555}"
  CAMERA_USER="${CAMERA_USER:-admin}"
  CAMERA_PASSWORD="${CAMERA_PASSWORD:-admin}"
  RECORD_RETAIN_DAYS="${RECORD_RETAIN_DAYS:-14}"
  DETECTION_ENABLED="${DETECTION_ENABLED:-false}"

  if (( VMS_MAX_CAMERAS > MAX_CAMERAS_HARD_LIMIT )); then
    warn "VMS_MAX_CAMERAS=${VMS_MAX_CAMERAS} exceeds hard limit ${MAX_CAMERAS_HARD_LIMIT}; clamping."
    VMS_MAX_CAMERAS="${MAX_CAMERAS_HARD_LIMIT}"
  fi
  if (( VMS_MAX_CAMERAS < 1 )); then
    die "VMS_MAX_CAMERAS must be >= 1"
  fi
}

have_cmd() {
  command -v "$1" >/dev/null 2>&1 && return 0
  # Some minimal images keep networking tools only under /sbin
  [[ -x "/usr/sbin/$1" || -x "/sbin/$1" ]]
}

ubuntu_or_die() {
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    source /etc/os-release
    case "${ID:-}:${VERSION_ID:-}" in
      ubuntu:20.*|ubuntu:22.*|ubuntu:24.*) return 0 ;;
      debian:*)
        warn "Debian detected; Ubuntu 22.04/24.04 is the supported target."
        return 0
        ;;
    esac
  fi
  die "Unsupported OS. This installer targets Ubuntu 20.04 / 22.04 / 24.04."
}

ensure_docker() {
  if have_cmd docker && docker compose version >/dev/null 2>&1; then
    log "Docker Compose already available."
    return 0
  fi
  log "Installing Docker Engine + Compose plugin..."
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg lsb-release
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi
  local codename
  codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu ${codename} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
  log "Docker installed."
}

ensure_host_packages() {
  local pkgs=(curl wget jq ffmpeg nmap avahi-utils python3 python3-yaml python3-venv iproute2)
  log "Ensuring host packages: ${pkgs[*]}"
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y "${pkgs[@]}"
}

render_template() {
  local src="$1" dest="$2"
  local detection_yaml="False"
  if [[ "${DETECTION_ENABLED}" == "true" || "${DETECTION_ENABLED}" == "True" ]]; then
    detection_yaml="True"
  fi
  sed \
    -e "s|{{MAX_CAMERAS}}|${VMS_MAX_CAMERAS}|g" \
    -e "s|{{RECORD_RETAIN_DAYS}}|${RECORD_RETAIN_DAYS}|g" \
    -e "s|{{DETECTION_ENABLED}}|${detection_yaml}|g" \
    -e "s|{{VMS_TZ}}|${VMS_TZ}|g" \
    "${src}" > "${dest}"
}
