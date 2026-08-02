const DEFAULT_APP_URL = 'https://jobmatch-web.onrender.com';

async function getSettings() {
  // Prefer local storage — Firefox sync can be empty / delayed for temporary add-ons.
  const local = await chrome.storage.local.get(['appUrl', 'token']);
  if (local.token) return local;
  const sync = await chrome.storage.sync.get(['appUrl', 'token']);
  return sync;
}

async function saveSettings(partial) {
  await chrome.storage.local.set(partial);
  try {
    await chrome.storage.sync.set(partial);
  } catch {
    // sync optional
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  const current = await getSettings();
  if (!current.appUrl) {
    await saveSettings({ appUrl: DEFAULT_APP_URL });
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
    void saveSettings({
      token: String(message.token || '').trim(),
      appUrl: String(message.appUrl || DEFAULT_APP_URL).replace(/\/$/, '') || DEFAULT_APP_URL,
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

  if (message?.type === 'JOBMATCH_GET_SETTINGS') {
    void getSettings()
      .then((data) =>
        sendResponse({
          ok: true,
          appUrl: data.appUrl || DEFAULT_APP_URL,
          hasToken: Boolean(data.token),
        }),
      )
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
  const { appUrl, token } = await getSettings();
  if (!token) {
    return { ok: false, error: 'Not connected. Open the extension popup and paste your token.' };
  }
  const base = (appUrl && String(appUrl).trim()) || DEFAULT_APP_URL;
  const url = `${base.replace(/\/$/, '')}${path}`;

  let res;
  try {
    const headers = {
      // Custom header avoids Clerk treating the token as a session JWT.
      'X-JobMatch-Extension-Token': token,
    };
    if (body) headers['Content-Type'] = 'application/json';

    res = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: `${detail} (could not reach ${url}). Check the extension app URL and that JobMatch is online.`,
    };
  }

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
