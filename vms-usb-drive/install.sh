#!/usr/bin/env bash
# Entry point on the USB root package — delegates to scripts/install.sh
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec sudo "${ROOT}/scripts/install.sh" "$@"
