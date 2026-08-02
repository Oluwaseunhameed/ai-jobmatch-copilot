# JobMatch Copilot browser extension (Path B)

Injects an **AutoFill drawer on employer apply pages** and fills the form in *your* browser tab (never auto-submits).

## Load unpacked (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select this folder: `apps/extension`
4. Sign in to JobMatch → open **Browser extension** in the sidebar (`/extension/connect`) → **Generate extension token**
5. If the page says the extension saved the token, you’re done. Otherwise open the extension popup → paste token → **Save**
6. Open an apply URL → click the teal **JM** tab on the right → **Autofill**

## Notes

- Best results when the apply URL matches a job in JobMatch (`job.applyUrl`)
- Autofill uses your fill plan / profile fields and the same selector map as Path A
- Submit remains manual (ADR-028 / ADR-033)
- Production app URL default: `https://jobmatch-web.onrender.com`
