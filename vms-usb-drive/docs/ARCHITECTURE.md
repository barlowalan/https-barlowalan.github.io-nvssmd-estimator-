# VMS Architecture

```
┌──────────────── USB VMS Drive ────────────────┐
│  install.sh → scripts/install.sh              │
│  detect-cameras.sh → ONVIF + nmap + ffprobe   │
│  apply-cameras.sh → Frigate config.yml        │
│  docker/docker-compose.yml                    │
└───────────────────────┬───────────────────────┘
                        │ sudo ./install.sh
                        ▼
┌──────────── Ubuntu host (/opt/vms) ────┐
│  systemd: vms.service                  │
│  docker compose → container vms        │
│       │                                       │
│       ├─ Frigate UI :5000                     │
│       ├─ RTSP restream :8554                  │
│       └─ WebRTC :8555                         │
│  config/ → Frigate YAML + cameras.yaml        │
│  data/   → recordings & clips                 │
└───────────┬───────────────────────────────────┘
            │ RTSP / ONVIF
            ▼
     Up to 24 IP cameras on LAN
```

## Camera limit

`MAX_CAMERAS_HARD_LIMIT=24` in `scripts/lib.sh` and `detect_cameras.py`.  
`VMS_MAX_CAMERAS` in `vms.env` may be lower but never higher than 24.

## Discovery pipeline

1. **ONVIF WS-Discovery** multicast Probe for `NetworkVideoTransmitter`
2. **nmap** TCP scan of local IPv4 CIDRs for open ports **554** / **8554**
3. Merge by host IP, sort, truncate to max
4. Optional **ffprobe** against common vendor RTSP paths using site credentials
5. Write `cameras.yaml` → merge into Frigate `cameras:` + `go2rtc.streams`

## Hardware guidance (24 cameras)

| Resource | Minimum | Recommended |
| --- | --- | --- |
| CPU | 4 cores | 8+ cores |
| RAM | 8 GB | 16 GB |
| Storage | 50 GB free | Dedicated HDD/SSD for recordings |
| Network | Gigabit | Dedicated camera VLAN / PoE switch |
| GPU | Optional | Coral / NVIDIA for detection at scale |

Detection is off by default (`DETECTION_ENABLED=false`) so a mid-range CPU can record 24 streams; enable later if hardware allows.
