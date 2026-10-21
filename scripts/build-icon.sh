#!/usr/bin/env bash
# Regenerates icon.iconset/ and assets/icon.png from assets/icon.svg.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVG="$ROOT/assets/icon.svg"
ICONSET="$ROOT/icon.iconset"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

swift "$ROOT/scripts/render-icon.swift" "$SVG" "$TMP" 16 32 64 128 256 512 1024

rm -rf "$ICONSET"
mkdir -p "$ICONSET"

cp "$TMP/icon_16.png" "$ICONSET/icon_16x16.png"
cp "$TMP/icon_32.png" "$ICONSET/icon_16x16@2x.png"
cp "$TMP/icon_32.png" "$ICONSET/icon_32x32.png"
cp "$TMP/icon_64.png" "$ICONSET/icon_32x32@2x.png"
cp "$TMP/icon_128.png" "$ICONSET/icon_128x128.png"
cp "$TMP/icon_256.png" "$ICONSET/icon_128x128@2x.png"
cp "$TMP/icon_256.png" "$ICONSET/icon_256x256.png"
cp "$TMP/icon_512.png" "$ICONSET/icon_256x256@2x.png"
cp "$TMP/icon_512.png" "$ICONSET/icon_512x512.png"
cp "$TMP/icon_1024.png" "$ICONSET/icon_512x512@2x.png"
cp "$TMP/icon_1024.png" "$ROOT/assets/icon.png"

# Validate the iconset with Apple's compiler (also used by Electrobun).
iconutil -c icns "$ICONSET" -o "$TMP/icon.icns"

echo "icon.iconset/ + assets/icon.png updated"
