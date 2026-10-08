# Install NVSSMD VMS from USB (Ubuntu)

## Prepare the USB stick (office / shop)

```bash
# From a machine that has this repo checked out:
cd vms-usb-drive
./scripts/prepare-usb.sh /mnt/vms-usb
sync
sudo umount /mnt/vms-usb
```

Label suggestion: **NVSSMD-VMS**

## On the site Ubuntu PC

1. Confirm Ubuntu 22.04 or 24.04 LTS, network to cameras, sudo access.
2. Insert the USB drive.
3. Open Terminal:

```bash
cd /media/$USER/*/NVSSMD-VMS-Drive   # adjust mount path
chmod +x install.sh scripts/*.sh scripts/*.py
./scripts/check-requirements.sh
```

4. (Optional) Edit site settings:

```bash
cp config/vms.env.example config/vms.env
nano config/vms.env   # set CAMERA_USER / CAMERA_PASSWORD / VMS_TZ
```

5. Install:

```bash
sudo ./install.sh
```

The installer will:

- Install Docker if missing  
- Deploy Frigate under `/opt/nvssmd-vms`  
- Discover up to **24** cameras  
- Enable `nvssmd-vms.service` for reboot persistence  

6. Open the UI printed at the end, e.g. `http://192.168.1.50:5000`

## After install

```bash
sudo /opt/nvssmd-vms/bin/detect-cameras.sh
sudo /opt/nvssmd-vms/bin/apply-cameras.sh
/opt/nvssmd-vms/bin/status.sh
```

## Uninstall

```bash
sudo /path/to/NVSSMD-VMS-Drive/scripts/uninstall.sh        # keep recordings
sudo /path/to/NVSSMD-VMS-Drive/scripts/uninstall.sh --purge # delete all
```

## Offline / no-pull installs

If the Frigate image was pre-cached on the USB host or a local registry:

```bash
sudo ./install.sh --skip-pull
```

Pre-load on a networked machine with:

```bash
docker pull ghcr.io/blakeblackshear/frigate:stable
docker save ghcr.io/blakeblackshear/frigate:stable | gzip > frigate-stable.tar.gz
# on site:
gunzip -c frigate-stable.tar.gz | sudo docker load
```
