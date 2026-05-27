# Build Assets

This folder contains assets required for packaging LiveSound on all platforms.

## Required Files

### Windows
- `icon.ico` — Application icon (256x256 or larger, multi-size .ico)
- `tray.png` — Tray icon (16x16 recommended)

### macOS
- `icon.icns` — Application icon (1024x1024, .icns format)
- `tray.png` — Tray icon (16x16 recommended, will be resized)

### Linux
- `icons/` — Directory containing icon sizes:
  - `16x16.png`
  - `32x32.png`
  - `48x48.png`
  - `64x64.png`
  - `128x128.png`
  - `256x256.png`
  - `512x512.png`
- `tray.png` — Tray icon (22x22 recommended for Linux)

## Generating Icons

### Windows .ico
Use an online converter or ImageMagick:
```bash
magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

### macOS .icns
Use `iconutil` on macOS:
```bash
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png
iconutil -c icns icon.iconset
```

### Linux PNGs
```bash
for size in 16 32 48 64 128 256 512; do
  magick icon.png -resize ${size}x${size} icons/${size}x${size}.png
done
```

> **Note:** If icons are missing, the app will still build and run using a fallback transparent icon for the tray.
