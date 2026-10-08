#!/usr/bin/env bash
# Local validation for USB VMS Drive (no Docker/sudo required for unit tests).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "== bash -n scripts =="
for f in "${ROOT}/install.sh" "${ROOT}/scripts/"*.sh; do
  bash -n "$f"
  echo "  OK $(basename "$f")"
done

echo "== python unit tests =="
python3 -m unittest discover -s "${ROOT}/tests" -p 'test_*.py' -v

echo "== prepare-usb dry layout =="
TMP="$(mktemp -d)"
trap 'rm -rf "${TMP}"' EXIT
"${ROOT}/scripts/prepare-usb.sh" "${TMP}"
test -f "${TMP}/NVSSMD-VMS-Drive/VERSION"
test -f "${TMP}/INSTALL-NVSSMD-VMS.txt"
test -x "${TMP}/NVSSMD-VMS-Drive/install.sh"
echo "  OK USB layout under ${TMP}"

echo "All VMS USB Drive tests passed."
