const appUrlInput = document.getElementById('appUrl');
const tokenInput = document.getElementById('token');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(['appUrl', 'token'], (data) => {
  appUrlInput.value = data.appUrl || 'https://jobmatch-web.onrender.com';
  tokenInput.value = data.token || '';
});

document.getElementById('save').addEventListener('click', async () => {
  const appUrl = appUrlInput.value.trim().replace(/\/$/, '');
  const token = tokenInput.value.trim();
  await chrome.storage.sync.set({ appUrl, token });
  statusEl.className = 'ok';
  statusEl.textContent = token
    ? 'Connected. Open an apply page to see the drawer.'
    : 'Saved app URL. Paste a token to finish connecting.';
});

document.getElementById('openConnect').addEventListener('click', async () => {
  const appUrl = (appUrlInput.value.trim() || 'https://jobmatch-web.onrender.com').replace(
    /\/$/,
    '',
  );
  await chrome.tabs.create({ url: `${appUrl}/extension/connect` });
});
