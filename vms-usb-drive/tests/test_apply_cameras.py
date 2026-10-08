#!/usr/bin/env python3
"""Unit tests for apply_cameras.py (no Docker required)."""

from __future__ import annotations

import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "apply_cameras.py"


def load_module():
    spec = importlib.util.spec_from_file_location("apply_cameras", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["apply_cameras"] = mod
    spec.loader.exec_module(mod)
    return mod


class ApplyCamerasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module()

    def test_hard_cap_24(self):
        cams = [
            {
                "id": f"cam{i:02d}",
                "host": f"192.168.1.{i}",
                "rtsp_main": f"rtsp://u:p@192.168.1.{i}:554/stream",
                "enabled": True,
            }
            for i in range(1, 30)
        ]
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            cameras = tmp_path / "cameras.yaml"
            config = tmp_path / "config.yml"
            cameras.write_text(
                "max_cameras: 24\ncameras:\n"
                + "\n".join(
                    f"  - id: {c['id']}\n    host: {c['host']}\n"
                    f"    rtsp_main: {c['rtsp_main']}\n    enabled: true"
                    for c in cams
                )
                + "\n",
                encoding="utf-8",
            )
            config.write_text("mqtt:\n  enabled: false\ncameras: {}\n", encoding="utf-8")
            rc = self.mod.apply(cameras, config, max_cameras=24)
            self.assertEqual(rc, 0)
            import yaml

            data = yaml.safe_load(config.read_text())
            self.assertEqual(len(data["cameras"]), 24)
            self.assertEqual(len(data["go2rtc"]["streams"]), 24)

    def test_placeholder_when_no_rtsp(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            cameras = tmp_path / "cameras.yaml"
            config = tmp_path / "config.yml"
            cameras.write_text(
                "cameras:\n  - id: cam01\n    host: 10.0.0.5\n    enabled: true\n",
                encoding="utf-8",
            )
            config.write_text("cameras: {}\n", encoding="utf-8")
            self.assertEqual(self.mod.apply(cameras, config, 24), 0)
            import yaml

            data = yaml.safe_load(config.read_text())
            path = data["cameras"]["cam01"]["ffmpeg"]["inputs"][0]["path"]
            self.assertIn("10.0.0.5", path)
            self.assertTrue(path.startswith("rtsp://"))


if __name__ == "__main__":
    unittest.main()
