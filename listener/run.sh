#!/bin/zsh
# Keep the band listener running: if it ever exits or crashes (macOS's Bluetooth layer can
# abort the process while reconnecting), start it again after 3 s. Ctrl+C twice to stop.
# Usage: listener/run.sh            (Bluetooth)
#        listener/run.sh --usb      (USB cable)
cd "$(dirname "$0")/.."
args=(--ble)
[[ "$1" == "--usb" ]] && args=()
while true; do
  caffeinate -i .venv/bin/python -W ignore listener/listen.py "${args[@]}"
  code=$?
  [[ $code -eq 0 || $code -eq 130 ]] && break     # stopped with Ctrl+C (a clean stop): don't restart
  echo "[$(date +%H:%M:%S)] Listener stopped (exit $code). Restarting in 3 s... (Ctrl+C to quit)"
  sleep 3 || break
done
