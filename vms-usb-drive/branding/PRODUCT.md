# NVSSMD VMS

**Product:** USB VMS Drive  
**Publisher:** NVSSMD, LLC  
**Target OS:** Ubuntu 20.04 / 22.04 / 24.04 LTS  
**Camera capacity:** up to **24** ONVIF / RTSP cameras  

## What it is

A field installer kit that turns a spare Ubuntu PC into an on-premises Video Management System (VMS / NVR). Technicians copy this package to a USB stick, plug it into the site recorder, and run one installer. The stack auto-discovers cameras on the LAN (ONVIF WS-Discovery + RTSP port scan) and records through Frigate with go2rtc restreaming.

## Design goals

1. **One USB, one install** — no cloud account required for core recording.
2. **24-camera hard cap** — sized for small/medium sites; discovery and apply scripts enforce the limit.
3. **Ubuntu-first** — Docker Compose + systemd for reliable reboot behavior.
4. **Operator-friendly** — detect → review YAML → apply → web UI.

## Stack

| Layer | Choice |
| --- | --- |
| NVR / VMS UI | Frigate (stable) |
| Restream / WebRTC | go2rtc (bundled in Frigate) |
| Host runtime | Docker Engine + Compose |
| Discovery | ONVIF WS-Discovery + nmap 554/8554 + ffprobe |
| Persistence | systemd `nvssmd-vms.service` |

## Out of scope (v1)

- Windows / macOS hosts  
- Cloud VMS bridging  
- More than 24 cameras  
- Built-in PoE switch management  
