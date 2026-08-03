const DEFAULT_APP_URL = 'https://jobmatch-web.onrender.com';

const appUrlInput = document.getElementById('appUrl');
const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');
const statusTitle = document.getElementById('statusTitle');
const statusDetail = document.getElementById('statusDetail');
const statusBadge = document.getElementById('statusBadge');
const disconnected = document.getElementById('disconnected');
const connectedActions = document.getElementById('connectedActions');
const pasteBox = document.getElementById('pasteBox');
const advanced = document.getElementById('advanced');

async function readSettings() {
  const local = await chrome.storage.local.get(['appUrl', 'token']);
  const sync = await chrome.storage.sync.get(['appUrl', 'token']);
  return {
    appUrl: local.appUrl || sync.appUrl || DEFAULT_APP_URL,
    token: local.token || sync.token || '',
  };
}

async function writeSettings(partial) {
  await chrome.storage.local.set(partial);
  try {
    await chrome.storage.sync.set(partial);
  } catch {
    // sync optional
  }
}

function setUiConnected(connected, appUrl) {
  statusTitle.textContent = connected ? 'Connected' : 'Not connected';
  statusDetail.textContent = connected
    ? 'Open an apply page and click the JM tab'
    : 'Connect once in JobMatch to get started';
  statusBadge.textContent = connected ? 'Ready' : 'Setup';
  statusBadge.className = connected ? 'badge' : 'badge off';
  disconnected.classList.toggle('hidden', connected);
  connectedActions.classList.toggle('hidden', !connected);
  appUrlInput.value = appUrl || DEFAULT_APP_URL;
}

async function refresh() {
  const { appUrl, token } = await readSettings();
  tokenInput.value = token;
  setUiConnected(Boolean(token), appUrl);
}

void refresh();

document.getElementById('pasteToggle').addEventListener('click', () => {
  pasteBox.classList.toggle('hidden');
});

document.getElementById('advancedToggle').addEventListener('click', () => {
  advanced.classList.toggle('open');
});

async function saveTokenFromInput() {
  const appUrl = (appUrlInput.value.trim() || DEFAULT_APP_URL).replace(/\/$/, '');
  const token = tokenInput.value.trim();
  await writeSettings({ appUrl, token });
  statusEl.className = token ? 'ok' : 'err';
  statusEl.textContent = token
    ? 'Saved. Open an apply page and use Autofill.'
    : 'Paste a connect code first.';
  await refresh();
}

document.getElementById('save').addEventListener('click', () => {
  void saveTokenFromInput();
});

document.getElementById('saveAdvanced').addEventListener('click', async () => {
  const appUrl = (appUrlInput.value.trim() || DEFAULT_APP_URL).replace(/\/$/, '');
  const { token } = await readSettings();
  await writeSettings({ appUrl, token });
  statusEl.className = 'ok';
  statusEl.textContent = 'Settings saved.';
  await refresh();
});

async function openConnectPage() {
  const { appUrl } = await readSettings();
  const base = (appUrlInput.value.trim() || appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  await chrome.tabs.create({ url: `${base}/extension/connect` });
}

document.getElementById('openConnect').addEventListener('click', () => {
  void openConnectPage();
});
document.getElementById('openConnectConnected').addEventListener('click', () => {
  void openConnectPage();
});

document.getElementById('test').addEventListener('click', async () => {
  statusEl.className = '';
  statusEl.textContent = 'Testing…';
  const { appUrl, token } = await readSettings();
  const base = (appUrlInput.value.trim() || appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  if (!token) {
    statusEl.className = 'err';
    statusEl.textContent = 'Not connected yet.';
    return;
  }
  try {
    const res = await fetch(
      `${base}/api/extension/assist?applyUrl=${encodeURIComponent('https://example.com/apply')}`,
      { headers: { 'X-JobMatch-Extension-Token': token } },
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      statusEl.className = 'err';
      statusEl.textContent = data?.error?.message || `Failed: ${res.status}`;
      return;
    }
    statusEl.className = 'ok';
    statusEl.textContent = 'Connection OK.';
  } catch (error) {
    statusEl.className = 'err';
    statusEl.textContent =
      error instanceof Error ? `${error.message} — check your JobMatch website setting.` : 'Network error';
  }
});
