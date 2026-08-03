(() => {
  if (window.__jobmatchConnectBridge) return;
  window.__jobmatchConnectBridge = true;

  function announce() {
    window.postMessage(
      {
        source: 'jobmatch-extension',
        type: 'JOBMATCH_EXTENSION_READY',
        ok: true,
      },
      window.location.origin,
    );
  }

  announce();
  // Re-announce shortly in case the page listener mounts after us.
  window.setTimeout(announce, 400);

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'jobmatch-extension-connect') return;

    if (data.type === 'JOBMATCH_EXTENSION_PING') {
      announce();
      return;
    }

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
