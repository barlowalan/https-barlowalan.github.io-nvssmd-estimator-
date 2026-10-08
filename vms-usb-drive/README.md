# USB VMS Drive

Field kit that installs an on-premises **Video Management System** on an **Ubuntu** PC and discovers up to **24** IP cameras.

| | |
| --- | --- |
| **Version** | see [`VERSION`](VERSION) |
| **OS** | Ubuntu 20.04 / 22.04 / 24.04 LTS |
| **Cameras** | ONVIF + RTSP, hard limit **24** |
| **Stack** | Docker · Frigate · go2rtc · systemd |

## Quick start (site PC)

```bash
cd /media/$USER/<USB>/VMS-Drive
./scripts/check-requirements.sh
sudo ./install.sh
```

Open the Frigate UI on port **5000**. Re-scan cameras:

```bash
sudo ./scripts/detect-cameras.sh
sudo ./scripts/apply-cameras.sh
```

## Build a USB stick

```bash
./scripts/prepare-usb.sh /mnt/vms-usb
```

See [`docs/INSTALL.md`](docs/INSTALL.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Layout

```
vms-usb-drive/
├── install.sh                 # USB entry point
├── VERSION
├── config/
│   ├── vms.env.example
│   └── cameras.yaml.example
├── docker/
│   ├── docker-compose.yml
│   └── frigate/config.yml.template
├── docs/
├── scripts/
│   ├── install.sh             # full Ubuntu installer
│   ├── detect-cameras.sh      # ≤24 camera discovery
│   ├── apply-cameras.sh
│   ├── prepare-usb.sh
│   ├── check-requirements.sh
│   ├── status.sh
│   └── uninstall.sh
└── tests/
```

## Design summary

1. **USB package** — copy-only kit; no custom ISO required.  
2. **One-command install** — Docker + Frigate + systemd.  
3. **Discovery** — ONVIF WS-Discovery, RTSP port scan, optional ffprobe.  
4. **Hard cap** — never more than 24 cameras enabled.  
5. **Operator loop** — detect → edit YAML → apply → UI.
