const DEFAULT_APP_URL = 'https://jobmatch-web.onrender.com';

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get(['appUrl']);
  if (!current.appUrl) {
    await chrome.storage.sync.set({ appUrl: DEFAULT_APP_URL });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'JOBMATCH_API') {
    void handleApi(message)
      .then(sendResponse)
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    return true;
  }

  if (message?.type === 'JOBMATCH_SAVE_TOKEN') {
    void chrome.storage.sync
      .set({
        token: String(message.token || '').trim(),
        appUrl: String(message.appUrl || DEFAULT_APP_URL).replace(/\/$/, ''),
      })
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    return true;
  }

  return false;
});

async function handleApi(message) {
  const { path, method = 'GET', body } = message;
  const { appUrl, token } = await chrome.storage.sync.get(['appUrl', 'token']);
  if (!token) {
    return { ok: false, error: 'Not connected. Open the extension popup and paste your token.' };
  }
  const base = (appUrl || DEFAULT_APP_URL).replace(/\/$/, '');
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error?.message || `Request failed: ${res.status}`,
      status: res.status,
    };
  }
  return { ok: true, data };
}
