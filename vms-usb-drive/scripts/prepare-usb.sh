#!/usr/bin/env bash
# Copy this VMS package onto a mounted USB drive (FAT32/exFAT/ext4).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib.sh
source "${SCRIPT_DIR}/lib.sh"

TARGET="${1:-}"
if [[ -z "${TARGET}" ]]; then
  cat <<EOF
Usage: $(basename "$0") /path/to/usb/mount

Copies the NVSSMD USB VMS Drive package onto a USB stick so you can
install VMS on an Ubuntu PC (up to ${MAX_CAMERAS_HARD_LIMIT} cameras).

Example:
  lsblk
  sudo mkdir -p /mnt/vms-usb
  sudo mount /dev/sdX1 /mnt/vms-usb
  ./scripts/prepare-usb.sh /mnt/vms-usb
  sync && sudo umount /mnt/vms-usb
EOF
  exit 1
fi

[[ -d "${TARGET}" ]] || die "Target mount not found: ${TARGET}"

DEST="${TARGET%/}/NVSSMD-VMS-Drive"
VERSION="$(vms_version)"
log "Preparing USB VMS Drive v${VERSION} → ${DEST}"

mkdir -p "${DEST}"
# Prefer rsync when available; otherwise recursive copy (USB prep hosts vary).
if have_cmd rsync; then
  rsync -a --delete \
    --exclude '.git/' \
    --exclude 'config/vms.env' \
    --exclude 'config/cameras.yaml' \
    --exclude '__pycache__/' \
    --exclude '*.pyc' \
    "${VMS_ROOT}/" "${DEST}/"
else
  rm -rf "${DEST}"
  mkdir -p "${DEST}"
  cp -a "${VMS_ROOT}/." "${DEST}/"
  rm -rf "${DEST}/.git" "${DEST}/config/vms.env" "${DEST}/config/cameras.yaml"
  find "${DEST}" -type d -name '__pycache__' -prune -exec rm -rf {} + 2>/dev/null || true
  find "${DEST}" -type f -name '*.pyc' -delete 2>/dev/null || true
fi

# Autorun-friendly entry points at USB root
cat > "${TARGET%/}/INSTALL-NVSSMD-VMS.txt" <<EOF
NVSSMD USB VMS Drive v${VERSION}
================================
Install Video Management System on Ubuntu (max ${MAX_CAMERAS_HARD_LIMIT} cameras).

1. Boot the target PC into Ubuntu 22.04 or 24.04 LTS (already installed).
2. Plug in this USB drive and open a terminal.
3. Find the mount point, e.g. /media/\$USER/NVSSMD or /mnt/vms-usb
4. Run:

   cd /media/\$USER/<USB>/NVSSMD-VMS-Drive
   chmod +x install.sh scripts/*.sh
   ./scripts/check-requirements.sh
   sudo ./install.sh

5. Open the web UI shown at the end of install (port 5000 by default).
6. Re-scan cameras anytime:

   sudo ./scripts/detect-cameras.sh
   sudo ./scripts/apply-cameras.sh

Publisher: NVSSMD, LLC — https://nvssmd.com
EOF

cp -f "${VMS_ROOT}/install.sh" "${DEST}/install.sh" 2>/dev/null || true
chmod +x "${DEST}/install.sh" "${DEST}/scripts/"*.sh "${DEST}/scripts/"*.py || true

# Optional: write a simple volume label hint
echo "NVSSMD-VMS" > "${DEST}/VOLUME_LABEL.txt"

log "USB contents ready at ${DEST}"
log "Safely eject after: sync && umount ${TARGET}"
