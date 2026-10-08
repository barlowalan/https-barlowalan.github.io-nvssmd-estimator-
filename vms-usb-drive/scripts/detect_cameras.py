#!/usr/bin/env python3
"""NVSSMD VMS — discover ONVIF / RTSP cameras on the LAN (max 24)."""

from __future__ import annotations

import argparse
import ipaddress
import json
import os
import re
import socket
import struct
import subprocess
import sys
import time
import uuid
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass, field
from typing import Any
from urllib.parse import quote

MAX_CAMERAS = 24
WS_DISCOVERY_ADDR = ("239.255.255.250", 3702)
PROBE_TIMEOUT = 3.0

PROBE = """<?xml version="1.0" encoding="UTF-8"?>
<e:Envelope xmlns:e="http://www.w3.org/2003/05/soap-envelope"
            xmlns:w="http://schemas.xmlsoap.org/ws/2004/08/addressing"
            xmlns:d="http://schemas.xmlsoap.org/ws/2005/04/discovery"
            xmlns:dn="http://www.onvif.org/ver10/network/wsdl">
  <e:Header>
    <w:MessageID>uuid:{msg_id}</w:MessageID>
    <w:To>urn:schemas-xmlsoap-org:ws:2005:04:discovery</w:To>
    <w:Action>http://schemas.xmlsoap.org/ws/2005/04/discovery/Probe</w:Action>
  </e:Header>
  <e:Body>
    <d:Probe>
      <d:Types>dn:NetworkVideoTransmitter</d:Types>
    </d:Probe>
  </e:Body>
</e:Envelope>
"""


@dataclass
class Camera:
    id: str
    name: str
    host: str
    manufacturer: str = "Unknown"
    model: str = "Unknown"
    onvif_url: str = ""
    rtsp_main: str = ""
    rtsp_sub: str = ""
    enabled: bool = True
    sources: list[str] = field(default_factory=list)


def local_cidrs() -> list[str]:
    cidrs: list[str] = []
    try:
        out = subprocess.check_output(
            ["ip", "-4", "-o", "addr", "show", "scope", "global"],
            text=True,
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return ["192.168.1.0/24"]
    for line in out.splitlines():
        parts = line.split()
        if "inet" in parts:
            idx = parts.index("inet")
            cidrs.append(parts[idx + 1])
    return cidrs or ["192.168.1.0/24"]


def parse_xaddrs(xml_text: str) -> list[str]:
    urls: list[str] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return urls
    for elem in root.iter():
        if elem.tag.endswith("XAddrs") and elem.text:
            urls.extend(elem.text.split())
    return urls


def host_from_url(url: str) -> str:
    m = re.search(r"://([^/:]+)", url)
    return m.group(1) if m else ""


def onvif_ws_discovery(timeout: float = PROBE_TIMEOUT) -> list[dict[str, str]]:
    found: dict[str, dict[str, str]] = {}
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    sock.settimeout(0.5)
    try:
        sock.bind(("", 0))
        ttl = struct.pack("b", 2)
        sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, ttl)
        msg = PROBE.format(msg_id=str(uuid.uuid4())).encode("utf-8")
        sock.sendto(msg, WS_DISCOVERY_ADDR)
        deadline = time.time() + timeout
        while time.time() < deadline:
            try:
                data, _addr = sock.recvfrom(65535)
            except socket.timeout:
                continue
            text = data.decode("utf-8", errors="ignore")
            for xaddr in parse_xaddrs(text):
                host = host_from_url(xaddr)
                if not host or host in found:
                    continue
                found[host] = {
                    "host": host,
                    "onvif_url": xaddr,
                    "source": "onvif-ws-discovery",
                }
    finally:
        sock.close()
    return list(found.values())


def nmap_rtsp_hosts(cidrs: list[str], max_hosts: int = 256) -> list[str]:
    hosts: list[str] = []
    for cidr in cidrs:
        try:
            net = ipaddress.ip_network(cidr, strict=False)
        except ValueError:
            continue
        # Cap very large nets to avoid long scans
        if net.num_addresses > max_hosts:
            continue
        try:
            proc = subprocess.run(
                [
                    "nmap",
                    "-n",
                    "-p",
                    "554,8554",
                    "--open",
                    "-T4",
                    "--max-retries",
                    "1",
                    "--host-timeout",
                    "5s",
                    str(net),
                    "-oG",
                    "-",
                ],
                capture_output=True,
                text=True,
                timeout=120,
                check=False,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
        for line in proc.stdout.splitlines():
            if line.startswith("Host:") and "Ports:" in line and "open" in line:
                host = line.split()[1]
                if host not in hosts:
                    hosts.append(host)
    return hosts


COMMON_RTSP_PATHS = [
    "/Streaming/Channels/101",
    "/Streaming/Channels/1",
    "/cam/realmonitor?channel=1&subtype=0",
    "/h264/ch1/main/av_stream",
    "/stream1",
    "/live/ch00_0",
    "/media/video1",
    "/",
]


def probe_rtsp(host: str, user: str, password: str, timeout: float = 3.0) -> tuple[str, str]:
    auth = f"{quote(user, safe='')}:{quote(password, safe='')}"
    main = ""
    sub = ""
    for path in COMMON_RTSP_PATHS:
        url = f"rtsp://{auth}@{host}:554{path}"
        try:
            proc = subprocess.run(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-rtsp_transport",
                    "tcp",
                    "-timeout",
                    str(int(timeout * 1_000_000)),
                    "-show_entries",
                    "stream=codec_type",
                    "-of",
                    "csv=p=0",
                    url,
                ],
                capture_output=True,
                text=True,
                timeout=timeout + 2,
                check=False,
            )
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue
        if proc.returncode == 0 and "video" in (proc.stdout or "").lower():
            main = url
            # Heuristic sub-stream for Hikvision-style paths
            if "Channels/101" in path:
                sub = url.replace("Channels/101", "Channels/102")
            elif "subtype=0" in path:
                sub = url.replace("subtype=0", "subtype=1")
            break
    return main, sub


def merge_discoveries(
    onvif: list[dict[str, str]],
    rtsp_hosts: list[str],
    user: str,
    password: str,
    max_cameras: int,
    probe: bool,
) -> list[Camera]:
    by_host: dict[str, Camera] = {}
    for item in onvif:
        host = item["host"]
        cam = Camera(
            id="",
            name=f"Camera {host}",
            host=host,
            onvif_url=item.get("onvif_url", ""),
            sources=[item.get("source", "onvif")],
        )
        by_host[host] = cam

    for host in rtsp_hosts:
        if host in by_host:
            if "rtsp-scan" not in by_host[host].sources:
                by_host[host].sources.append("rtsp-scan")
        else:
            by_host[host] = Camera(
                id="",
                name=f"Camera {host}",
                host=host,
                sources=["rtsp-scan"],
            )

    cameras = list(by_host.values())
    cameras.sort(key=lambda c: tuple(int(p) if p.isdigit() else p for p in c.host.split(".")))

    if probe and cameras:
        def _probe_one(cam: Camera) -> Camera:
            main, sub = probe_rtsp(cam.host, user, password)
            cam.rtsp_main = main
            cam.rtsp_sub = sub
            return cam

        with ThreadPoolExecutor(max_workers=8) as pool:
            futures = {pool.submit(_probe_one, c): c for c in cameras}
            for fut in as_completed(futures):
                fut.result()

    limited = cameras[:max_cameras]
    for i, cam in enumerate(limited, start=1):
        cam.id = f"cam{i:02d}"
        cam.name = f"Camera {i:02d} ({cam.host})"
    return limited


def to_yaml(cameras: list[Camera], max_cameras: int) -> str:
    lines = [
        f"# NVSSMD VMS camera inventory — generated {time.strftime('%Y-%m-%d %H:%M:%S')}",
        f"max_cameras: {max_cameras}",
        "cameras:",
    ]
    if not cameras:
        lines.append("  []")
        return "\n".join(lines) + "\n"
    for cam in cameras:
        lines.append(f"  - id: {cam.id}")
        lines.append(f"    name: {json.dumps(cam.name)}")
        lines.append(f"    host: {cam.host}")
        lines.append(f"    manufacturer: {json.dumps(cam.manufacturer)}")
        lines.append(f"    model: {json.dumps(cam.model)}")
        lines.append(f"    onvif_url: {json.dumps(cam.onvif_url)}")
        lines.append(f"    rtsp_main: {json.dumps(cam.rtsp_main)}")
        lines.append(f"    rtsp_sub: {json.dumps(cam.rtsp_sub)}")
        lines.append(f"    enabled: {'true' if cam.enabled else 'false'}")
        src = ", ".join(cam.sources)
        lines.append(f"    # sources: {src}")
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect up to 24 ONVIF/RTSP cameras")
    parser.add_argument("--max", type=int, default=int(os.environ.get("VMS_MAX_CAMERAS", MAX_CAMERAS)))
    parser.add_argument("--user", default=os.environ.get("CAMERA_USER", "admin"))
    parser.add_argument("--password", default=os.environ.get("CAMERA_PASSWORD", "admin"))
    parser.add_argument("--cidr", action="append", default=[])
    parser.add_argument("--no-nmap", action="store_true")
    parser.add_argument("--no-probe", action="store_true")
    parser.add_argument("--json", action="store_true", dest="as_json")
    parser.add_argument("-o", "--output", default="")
    args = parser.parse_args()

    max_cameras = min(max(1, args.max), MAX_CAMERAS)
    cidrs = args.cidr or local_cidrs()

    print(f"[detect] scanning ONVIF WS-Discovery (max {max_cameras})…", file=sys.stderr)
    onvif = onvif_ws_discovery()
    print(f"[detect] ONVIF responses: {len(onvif)}", file=sys.stderr)

    rtsp_hosts: list[str] = []
    if not args.no_nmap:
        print(f"[detect] nmap RTSP scan on {', '.join(cidrs)}…", file=sys.stderr)
        rtsp_hosts = nmap_rtsp_hosts(cidrs)
        print(f"[detect] RTSP-open hosts: {len(rtsp_hosts)}", file=sys.stderr)

    cameras = merge_discoveries(
        onvif,
        rtsp_hosts,
        args.user,
        args.password,
        max_cameras,
        probe=not args.no_probe,
    )

    if len(cameras) >= max_cameras:
        print(
            f"[detect] capped at {max_cameras} cameras (NVSSMD USB VMS Drive limit).",
            file=sys.stderr,
        )

    payload: dict[str, Any] = {
        "max_cameras": max_cameras,
        "count": len(cameras),
        "cameras": [asdict(c) for c in cameras],
    }

    if args.as_json:
        text = json.dumps(payload, indent=2) + "\n"
    else:
        text = to_yaml(cameras, max_cameras)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as fh:
            fh.write(text)
        print(f"[detect] wrote {args.output} ({len(cameras)} cameras)", file=sys.stderr)
    else:
        sys.stdout.write(text)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
