(() => {
  if (window.__jobmatchConnectBridge) return;
  window.__jobmatchConnectBridge = true;

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'jobmatch-extension-connect') return;
    if (data.type !== 'JOBMATCH_EXTENSION_TOKEN' || !data.token) return;

    chrome.runtime.sendMessage(
      {
        type: 'JOBMATCH_SAVE_TOKEN',
        token: data.token,
        appUrl: data.appUrl || window.location.origin,
      },
      (response) => {
        window.postMessage(
          {
            source: 'jobmatch-extension',
            type: 'JOBMATCH_EXTENSION_TOKEN_SAVED',
            ok: Boolean(response?.ok),
            error: response?.error || null,
          },
          window.location.origin,
        );
      },
    );
  });
})();
