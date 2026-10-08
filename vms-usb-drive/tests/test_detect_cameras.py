#!/usr/bin/env python3
"""Unit tests for detect_cameras helpers (no network required)."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "detect_cameras.py"


def load_module():
    spec = importlib.util.spec_from_file_location("detect_cameras", SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    sys.modules["detect_cameras"] = mod
    spec.loader.exec_module(mod)
    return mod


class DetectCamerasTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.mod = load_module()

    def test_max_constant(self):
        self.assertEqual(self.mod.MAX_CAMERAS, 24)

    def test_merge_caps_at_24(self):
        onvif = [{"host": f"192.168.0.{i}", "onvif_url": f"http://192.168.0.{i}/onvif"} for i in range(1, 40)]
        cams = self.mod.merge_discoveries(onvif, [], "admin", "admin", 24, probe=False)
        self.assertEqual(len(cams), 24)
        self.assertEqual(cams[0].id, "cam01")
        self.assertEqual(cams[-1].id, "cam24")

    def test_parse_xaddrs(self):
        xml = """<?xml version="1.0"?>
        <Envelope><Body><ProbeMatches><ProbeMatch>
        <XAddrs>http://192.168.1.50/onvif/device_service</XAddrs>
        </ProbeMatch></ProbeMatches></Body></Envelope>"""
        urls = self.mod.parse_xaddrs(xml)
        self.assertEqual(urls, ["http://192.168.1.50/onvif/device_service"])

    def test_yaml_empty(self):
        text = self.mod.to_yaml([], 24)
        self.assertIn("max_cameras: 24", text)
        self.assertIn("cameras:", text)


if __name__ == "__main__":
    unittest.main()
