# Lagree Builder (Pages-Min)
**Iterate by editing only `app.js` in GitHub.**

## Deploy (GitHub Pages)
1. Create a new public repo.
2. Upload these files to the repo root:
   - `index.html`
   - `app.js`
   - `manifest.webmanifest`
   - `sw.js`
   - `icon-192.png`
   - `icon-512.png`
   - `apple-touch-icon-180.png`
3. Repo → Settings → Pages → Source: **Deploy from a branch**, Branch: `main`, Folder: **/** (root). Save.
4. Your site will be live at `https://USERNAME.github.io/REPO/`.

## Iterate fast
- Edit `app.js` in GitHub (✏️) → Commit → refresh your iPhone.
- `sw.js` is set to **network-first for app.js** (so updates appear quickly).
- If something looks cached, bump the script query in `index.html` (`app.js?v=1755228459`) or bump `CACHE` in `sw.js`.

## Install on iPhone
Open the Pages URL in Safari → Share → **Add to Home Screen**.

Enjoy!
