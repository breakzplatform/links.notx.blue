#!/usr/bin/env bash
# Renders the icon sources with headless Chrome:
#   scripts/avatar.svg -> scripts/avatar.png (1000px master, not deployed)
#                      -> public/apple-touch-icon.png (180px, opaque, iOS rounds it)
#                      -> public/pwa-icon-192.png, public/pwa-icon-512.png (manifest icons)
#                      -> public/icon-192.png (logo_uri in client-metadata.json)
# The favicon is public/favicon.svg, edited by hand.
set -euo pipefail

cd "$(dirname "$0")/.."

CHROME="${CHROME:-}"
if [[ -z "$CHROME" ]]; then
  for candidate in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary" \
    "$(command -v chromium || true)"; do
    if [[ -n "$candidate" && -x "$candidate" ]]; then CHROME="$candidate"; break; fi
  done
fi
[[ -n "$CHROME" ]] || { echo "Chrome not found; set CHROME=/path/to/chrome" >&2; exit 1; }
command -v python3 >/dev/null || { echo "python3 not found; needed to check the output" >&2; exit 1; }

# Prints "<width>x<height>" from a PNG header.
png_size() {
  python3 -c 'import struct,sys; d=open(sys.argv[1],"rb").read(24); print("%dx%d" % struct.unpack(">II", d[16:24]))' "$1"
}

# Headless Chrome clamps small windows to a minimum width, so a small render
# comes out cropped. Always render large, then downscale.
render() {
  local source="$1" size="$2" output="$3"
  rm -f "$output"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size="$size,$size" \
    --screenshot="$PWD/$output" "file://$PWD/$source" 2>/dev/null
  [[ "$(png_size "$output")" == "${size}x${size}" ]] || { echo "Bad render: $output" >&2; exit 1; }
}

render scripts/avatar.svg 1000 scripts/avatar.png
echo "Wrote scripts/avatar.png"

sips -z 180 180 scripts/avatar.png --out public/apple-touch-icon.png >/dev/null
[[ "$(png_size public/apple-touch-icon.png)" == "180x180" ]] || { echo "Bad resize: public/apple-touch-icon.png" >&2; exit 1; }
echo "Wrote public/apple-touch-icon.png"

# PWA icons for manifest.webmanifest. The card stays inside the maskable safe
# zone (a centred circle of 80% diameter), so the same files serve both purposes.
for size in 192 512; do
  sips -z "$size" "$size" scripts/avatar.png --out "public/pwa-icon-$size.png" >/dev/null
  [[ "$(png_size "public/pwa-icon-$size.png")" == "${size}x${size}" ]] || { echo "Bad resize: public/pwa-icon-$size.png" >&2; exit 1; }
  echo "Wrote public/pwa-icon-$size.png"
done

# The OAuth client metadata names this file as its logo; keep it in step.
cp public/pwa-icon-192.png public/icon-192.png
echo "Wrote public/icon-192.png"
