# Brand

Money Swap logo — the "Dark Terminal" swap mark.

## Source

- `money-swap-icon.svg` — full app-icon tile (charcoal + blue `⇄`), square. Source for `icon.png` / `adaptive-icon.png`.
- `money-swap-mark.svg` — mark only, transparent. For the Android adaptive foreground, splash, or any stamp on a coloured surface.

Both are pure vector — edit here, then re-export the raster assets.

## Colors

| | Hex |
|---|---|
| Blue (mark) | `#3D7BFF` → highlight `#82ABFF` |
| Tile | `#1C2434` → `#0F141C` |
| App background | `#171C24` |

## Generated assets (in the apps)

- `mobile/assets/images/icon.png` — 1024², no alpha (iOS requirement).
- `mobile/assets/images/adaptive-icon.png` — 1024², on `#171C24` (`app.json`).
- `mobile/assets/images/splash.png` — transparent mark, centred on `#171C24`.
- `mobile/assets/images/favicon.png` — 48².
- `frontend/public/favicon.svg` — rounded tile, wired in `frontend/index.html`.

Re-rasterize from the SVGs with a real renderer (headless Chrome / rsvg / Inkscape) — ImageMagick alone renders SVG gradients poorly.
