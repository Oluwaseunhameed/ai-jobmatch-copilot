const appUrlInput = document.getElementById('appUrl');
const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');

async function load() {
  const local = await chrome.storage.local.get(['appUrl', 'token']);
  const sync = await chrome.storage.sync.get(['appUrl', 'token']);
  appUrlInput.value = local.appUrl || sync.appUrl || 'https://jobmatch-web.onrender.com';
  tokenInput.value = local.token || sync.token || '';
}

void load();

document.getElementById('save').addEventListener('click', async () => {
  const appUrl = appUrlInput.value.trim().replace(/\/$/, '') || 'https://jobmatch-web.onrender.com';
  const token = tokenInput.value.trim();
  await chrome.storage.local.set({ appUrl, token });
  try {
    await chrome.storage.sync.set({ appUrl, token });
  } catch {
    // ignore
  }
  statusEl.className = 'ok';
  statusEl.textContent = token
    ? 'Connected. Open an apply page to see the drawer.'
    : 'Saved app URL. Paste a token to finish connecting.';
});

document.getElementById('test').addEventListener('click', async () => {
  statusEl.className = '';
  statusEl.textContent = 'Testing…';
  const appUrl = (appUrlInput.value.trim() || 'https://jobmatch-web.onrender.com').replace(/\/$/, '');
  const token = tokenInput.value.trim();
  if (!token) {
    statusEl.className = 'err';
    statusEl.textContent = 'Paste a token first.';
    return;
  }
  try {
    const res = await fetch(
      `${appUrl}/api/extension/assist?applyUrl=${encodeURIComponent('https://example.com/apply')}`,
      { headers: { 'X-JobMatch-Extension-Token': token } },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.className = 'err';
      statusEl.textContent = data?.error?.message || `Failed: ${res.status}`;
      return;
    }
    statusEl.className = 'ok';
    statusEl.textContent = 'Connection OK. Open an employer apply page and use Autofill.';
  } catch (error) {
    statusEl.className = 'err';
    statusEl.textContent =
      error instanceof Error
        ? `${error.message} — is the app URL correct and reachable?`
        : 'Network error';
  }
});

document.getElementById('openConnect').addEventListener('click', async () => {
  const appUrl = (appUrlInput.value.trim() || 'https://jobmatch-web.onrender.com').replace(
    /\/$/,
    '',
  );
  await chrome.tabs.create({ url: `${appUrl}/extension/connect` });
});
