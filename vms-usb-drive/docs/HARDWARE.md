# Hardware & camera notes

## Supported cameras

- ONVIF Profile S / T IP cameras (preferred for discovery)
- Any camera exposing RTSP H.264/H.265 on TCP 554 (or 8554)

Vendor path heuristics cover common Hikvision, Dahua, Axis-style URLs. If `rtsp_main` is empty after detect, edit `cameras.yaml` with the vendor RTSP URL from the camera web UI.

## Capacity: 24 cameras

This kit is sized for **≤24** concurrent cameras. Discovery and apply scripts refuse to enable more.

Rough bitrate planning (continuous record):

- 24 × 4 MP @ 15 fps H.264 ≈ 48–96 Mbps aggregate  
- Use a **dedicated Gigabit** uplink from the PoE switch to the VMS PC  
- Prefer sub-streams for detect/live; main stream for record  

## Ubuntu PC checklist

- [ ] Wired Ethernet to camera network / VLAN  
- [ ] Static IP or DHCP reservation for the VMS host  
- [ ] NTP / correct timezone (`VMS_TZ`)  
- [ ] Enough disk for retention (`RECORD_RETAIN_DAYS`)  
- [ ] BIOS set to reboot after power loss  

## PoE switch

Cameras are powered by the PoE switch — the USB VMS Drive does **not** manage PoE. Ensure switch budget covers all cameras at peak.
