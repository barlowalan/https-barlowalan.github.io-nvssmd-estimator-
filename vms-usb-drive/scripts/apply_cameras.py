#!/usr/bin/env python3
"""Merge cameras.yaml into Frigate config.yml (max 24)."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Any

try:
    import yaml
except ImportError:
    print("ERROR: PyYAML required (apt install python3-yaml)", file=sys.stderr)
    raise SystemExit(2)

MAX_CAMERAS = 24


def load_yaml(path: Path) -> Any:
    with path.open(encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {}


def safe_id(raw: str, index: int) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", raw or f"cam{index:02d}")
    if not cleaned or cleaned[0].isdigit():
        cleaned = f"cam_{cleaned}"
    return cleaned[:32]


def build_camera_block(cam: dict[str, Any], index: int) -> tuple[str, dict[str, Any]]:
    cam_id = safe_id(str(cam.get("id") or f"cam{index:02d}"), index)
    main = (cam.get("rtsp_main") or "").strip()
    sub = (cam.get("rtsp_sub") or "").strip()
    if not main:
        host = cam.get("host") or "0.0.0.0"
        # Placeholder path — operator must fill credentials / path
        main = f"rtsp://admin:admin@{host}:554/Streaming/Channels/101"
    roles = ["record", "detect"]
    ffmpeg: dict[str, Any] = {"inputs": [{"path": main, "roles": roles}]}
    if sub:
        ffmpeg["inputs"] = [
            {"path": main, "roles": ["record"]},
            {"path": sub, "roles": ["detect"]},
        ]
    block = {
        "ffmpeg": ffmpeg,
        "detect": {"enabled": True, "width": 1280, "height": 720, "fps": 5},
        "record": {"enabled": True},
        "snapshots": {"enabled": True},
    }
    return cam_id, block


def apply(cameras_path: Path, config_path: Path, max_cameras: int) -> int:
    inventory = load_yaml(cameras_path)
    cams = inventory.get("cameras") or []
    if not isinstance(cams, list):
        print("ERROR: cameras.yaml must contain a cameras: list", file=sys.stderr)
        return 1

    enabled = [c for c in cams if c and c.get("enabled", True)]
    if len(enabled) > max_cameras:
        print(
            f"WARNING: {len(enabled)} enabled cameras; keeping first {max_cameras}",
            file=sys.stderr,
        )
        enabled = enabled[:max_cameras]

    if config_path.exists():
        config = load_yaml(config_path)
    else:
        config = {}

    if not isinstance(config, dict):
        config = {}

    go2rtc = config.setdefault("go2rtc", {})
    streams = go2rtc.setdefault("streams", {})
    if not isinstance(streams, dict):
        streams = {}
        go2rtc["streams"] = streams

    camera_section: dict[str, Any] = {}
    for i, cam in enumerate(enabled, start=1):
        cam_id, block = build_camera_block(cam, i)
        camera_section[cam_id] = block
        inputs = block["ffmpeg"]["inputs"]
        stream_urls = [inp["path"] for inp in inputs]
        streams[cam_id] = stream_urls

    config["cameras"] = camera_section
    # Preserve mqtt/record/ui etc. from template

    with config_path.open("w", encoding="utf-8") as fh:
        yaml.safe_dump(config, fh, default_flow_style=False, sort_keys=False)

    print(f"Applied {len(camera_section)} camera(s) → {config_path}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cameras", required=True, type=Path)
    parser.add_argument("--config", required=True, type=Path)
    parser.add_argument("--max", type=int, default=MAX_CAMERAS)
    args = parser.parse_args()
    max_cameras = min(max(1, args.max), MAX_CAMERAS)
    if not args.cameras.exists():
        print(f"ERROR: missing {args.cameras}", file=sys.stderr)
        return 1
    return apply(args.cameras, args.config, max_cameras)


if __name__ == "__main__":
    raise SystemExit(main())
