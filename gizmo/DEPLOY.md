# Deploying VibeReader to Telus Gizmo

## What is in this directory
This is a patched copy of VibeReader ready for Gizmo. Changes applied:
- layout.tsx: Cookiebot and Amplitude removed, SITE_URL set to placeholder
- page.tsx: About/GitHub links removed, save-card button removed
- app/r/[slug]/page.tsx: rewritten as client-side (fetches from worker API)
- app/archive/: removed (needs separate porting if needed)
- next.config.js: added (static export)
- worker.ts: added (Cloudflare Worker for all API routes)
- wrangler.toml: added (D1 binding + FUEL_IX_API_KEY)

## Prerequisites
- Node 18+
- Spotify Developer app with Redirect URI: https://YOUR-APP.telus.gizmos.run/spotify-callback

## 1. Build the front-end
Set NEXT_PUBLIC_SPOTIFY_CLIENT_ID as a shell environment variable, then run: npm install && npx next build
This generates the out/ directory.

## 2. Package the zip
Copy out/ to dist/, then zip dist/ + worker.ts + wrangler.toml into vibereader-gizmo.zip

## 3. Deploy
Upload vibereader-gizmo.zip to https://telus.gizmos.run/deploy. Pick an app name.

## 4. Post-deploy configuration
In the Gizmo dashboard under Vars, set:
- FUEL_IX_BASE_URL: your actual Fuel iX endpoint URL
- FUEL_IX_MODEL: model name (e.g. claude-3-5-sonnet-20241022)
- SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET

## Feature status

| Feature | Status |
|---|---|
| Book to songs | Works |
| Song to books (text entry) | Works |
| Song to books (Spotify link) | Dropped - audio features path removed |
| Spotify playlist export | Works |
| Permanent mix links /r/slug | Works via D1 |
| OG image cards (save card button) | Dropped |
| Archive page | Dropped - needs client-side port |
| Amplitude analytics | Removed |
| Cookiebot consent | Removed |
