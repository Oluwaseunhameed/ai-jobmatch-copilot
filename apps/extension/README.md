# JobMatch Copilot browser extension (Path B)

Injects an **AutoFill drawer on employer apply pages** and fills the form in *your* browser tab (never auto-submits).

Works in **Firefox** and **Chrome** (Manifest V3). Requires Firefox 121+.

## Load in Firefox (temporary)

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select **`apps/extension/manifest.json`** (any file in that folder also works)
4. Sign in to JobMatch → **Browser extension** (`/extension/connect`) → **Generate extension token**
5. If the page says the extension saved the token, you’re done. Otherwise open the extension popup (puzzle icon → JobMatch Autofill) → paste token → **Save**
6. Open an apply URL → click the teal **JM** tab on the right → **Autofill**

Temporary add-ons are removed when Firefox restarts — reload the same way after a restart.

## Load unpacked (Chrome / Chromium)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the folder `apps/extension`
4. Same connect steps as Firefox (token → apply page → **JM** tab)

## Notes

- Best results when the apply URL matches a job in JobMatch (`job.applyUrl`)
- Autofill uses your fill plan / profile fields and the same selector map as Path A
- Submit remains manual (ADR-028 / ADR-033)
- Production app URL default: `https://jobmatch-web.onrender.com`
