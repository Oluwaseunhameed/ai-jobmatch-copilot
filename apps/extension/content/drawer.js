(() => {
  if (window.__jobmatchDrawerInjected) return;
  window.__jobmatchDrawerInjected = true;

  // Use only div/span/button — ATS pages (Ashby/Greenhouse) often zero line-height on
  // semantic tags; inherited host styles can still leak into open shadow trees.
  const DRAWER_CSS = `
    :host {
      all: initial !important;
      display: block !important;
      position: fixed !important;
      inset: 0 !important;
      width: 100% !important;
      height: 100% !important;
      max-width: none !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: 0 !important;
      overflow: visible !important;
      pointer-events: none !important;
      z-index: 2147483646 !important;
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif !important;
      font-size: 14px !important;
      font-weight: 400 !important;
      font-style: normal !important;
      line-height: 1.45 !important;
      letter-spacing: normal !important;
      color: #111111 !important;
      background: transparent !important;
      text-align: left !important;
      text-transform: none !important;
      text-decoration: none !important;
      white-space: normal !important;
      box-sizing: border-box !important;
    }
    *, *::before, *::after {
      box-sizing: border-box !important;
      font-family: inherit !important;
      line-height: inherit !important;
      letter-spacing: normal !important;
      text-transform: none !important;
      float: none !important;
      clear: none !important;
    }
    .jm-shell {
      position: fixed !important;
      inset: 0 !important;
      pointer-events: none !important;
      z-index: 2147483646 !important;
    }
    .jm-tab {
      pointer-events: auto !important;
      position: fixed !important;
      top: 40% !important;
      right: 0 !important;
      transform: translateY(-50%) !important;
      border: 0 !important;
      background: #0f766e !important;
      color: #ffffff !important;
      padding: 10px 8px !important;
      border-radius: 8px 0 0 8px !important;
      cursor: pointer !important;
      font-size: 12px !important;
      font-weight: 700 !important;
      line-height: 1.2 !important;
      box-shadow: 0 8px 24px rgba(0,0,0,.18) !important;
    }
    .jm-drawer {
      pointer-events: auto !important;
      position: fixed !important;
      top: 0 !important;
      right: 0 !important;
      height: 100vh !important;
      width: min(380px, 100vw) !important;
      background: #fafafa !important;
      color: #111111 !important;
      border-left: 1px solid #e5e5e5 !important;
      box-shadow: -12px 0 40px rgba(0,0,0,.12) !important;
      transform: translateX(105%) !important;
      transition: transform .22s ease !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
    }
    .jm-drawer.is-open { transform: translateX(0) !important; }
    .jm-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 12px !important;
      padding: 14px !important;
      border-bottom: 1px solid #e8e8e8 !important;
      background: #ffffff !important;
      flex-shrink: 0 !important;
    }
    .jm-brand {
      display: flex !important;
      gap: 10px !important;
      align-items: center !important;
      min-width: 0 !important;
    }
    .jm-mark {
      width: 28px !important;
      height: 28px !important;
      border-radius: 8px !important;
      background: #0f766e !important;
      flex-shrink: 0 !important;
    }
    .jm-brand-text {
      display: flex !important;
      flex-direction: column !important;
      gap: 2px !important;
      min-width: 0 !important;
    }
    .jm-title {
      display: block !important;
      font-size: 14px !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
      color: #111111 !important;
    }
    .jm-title-accent { color: #0f766e !important; }
    .jm-sub {
      display: block !important;
      font-size: 11px !important;
      line-height: 1.3 !important;
      color: #666666 !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      max-width: 240px !important;
    }
    .jm-icon-btn {
      border: 0 !important;
      background: transparent !important;
      font-size: 20px !important;
      line-height: 1 !important;
      cursor: pointer !important;
      color: #444444 !important;
      padding: 4px !important;
    }
    .jm-body {
      padding: 14px !important;
      overflow: auto !important;
      display: flex !important;
      flex-direction: column !important;
      gap: 10px !important;
      flex: 1 1 auto !important;
    }
    .jm-primary {
      height: 44px !important;
      border: 0 !important;
      border-radius: 10px !important;
      background: #0f766e !important;
      color: #ffffff !important;
      font-weight: 700 !important;
      font-size: 14px !important;
      line-height: 1 !important;
      cursor: pointer !important;
      width: 100% !important;
    }
    .jm-primary:disabled { opacity: .6 !important; cursor: default !important; }
    .jm-help, .jm-muted, .jm-note {
      display: block !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      color: #666666 !important;
      margin: 0 !important;
      padding: 0 !important;
      position: static !important;
    }
    .jm-link {
      border: 0 !important;
      background: transparent !important;
      color: #0f766e !important;
      text-align: left !important;
      padding: 0 !important;
      cursor: pointer !important;
      font-size: 13px !important;
      font-weight: 600 !important;
      line-height: 1.4 !important;
      text-decoration: underline !important;
      width: fit-content !important;
    }
    .jm-progress { display: block !important; width: 100% !important; }
    .jm-progress-label {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      font-size: 12px !important;
      line-height: 1.4 !important;
      margin: 0 0 6px !important;
      color: #111111 !important;
    }
    .jm-progress-pct { font-weight: 700 !important; }
    .jm-bar {
      height: 8px !important;
      background: #e8e8e8 !important;
      border-radius: 99px !important;
      overflow: hidden !important;
      width: 100% !important;
    }
    .jm-bar-fill {
      display: block !important;
      height: 100% !important;
      background: #0f766e !important;
      width: 0%;
    }
    .jm-fields {
      display: flex !important;
      flex-direction: column !important;
      gap: 8px !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    .jm-field {
      display: flex !important;
      flex-direction: row !important;
      gap: 8px !important;
      align-items: flex-start !important;
      justify-content: space-between !important;
      border: 1px solid #e8e8e8 !important;
      background: #ffffff !important;
      border-radius: 10px !important;
      padding: 10px !important;
      margin: 0 !important;
      position: static !important;
      width: 100% !important;
    }
    .jm-field-main {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      min-width: 0 !important;
      flex: 1 1 auto !important;
      position: static !important;
    }
    .jm-field-label {
      display: block !important;
      position: static !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      line-height: 1.35 !important;
      color: #111111 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .jm-field-value {
      display: block !important;
      position: static !important;
      font-size: 12px !important;
      font-weight: 400 !important;
      line-height: 1.45 !important;
      color: #666666 !important;
      margin: 0 !important;
      padding: 0 !important;
      white-space: normal !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
    }
    .jm-copy {
      border: 1px solid #dddddd !important;
      background: #ffffff !important;
      border-radius: 8px !important;
      padding: 6px 8px !important;
      font-size: 11px !important;
      line-height: 1.2 !important;
      cursor: pointer !important;
      color: #111111 !important;
      flex-shrink: 0 !important;
    }
    .jm-error {
      display: block !important;
      color: #b91c1c !important;
      background: #fef2f2 !important;
      border: 1px solid #fecaca !important;
      border-radius: 8px !important;
      padding: 8px 10px !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      margin: 0 !important;
    }
    .jm-modal {
      pointer-events: auto !important;
      position: fixed !important;
      inset: 0 !important;
      background: rgba(0,0,0,.35) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      padding: 16px !important;
      z-index: 2147483647 !important;
    }
    .jm-modal-card {
      width: min(560px, 100%) !important;
      max-height: 85vh !important;
      overflow: auto !important;
      background: #ffffff !important;
      border-radius: 16px !important;
      padding: 18px !important;
      box-shadow: 0 20px 60px rgba(0,0,0,.25) !important;
      color: #111111 !important;
    }
    .jm-modal-head {
      display: flex !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 12px !important;
      margin: 0 0 8px !important;
    }
    .jm-modal-title {
      display: block !important;
      margin: 0 !important;
      font-size: 18px !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
      color: #111111 !important;
    }
    .jm-modal-grid {
      display: grid !important;
      grid-template-columns: 1fr 1fr !important;
      gap: 10px !important;
      margin: 14px 0 0 !important;
    }
    .jm-profile-item {
      display: flex !important;
      flex-direction: column !important;
      gap: 4px !important;
      border: 1px solid #eeeeee !important;
      border-radius: 10px !important;
      padding: 8px 10px !important;
      margin: 0 !important;
      position: static !important;
      min-width: 0 !important;
    }
    .jm-profile-label {
      display: block !important;
      position: static !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      line-height: 1.3 !important;
      letter-spacing: .06em !important;
      text-transform: uppercase !important;
      color: #888888 !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .jm-profile-value {
      display: block !important;
      position: static !important;
      font-size: 13px !important;
      font-weight: 400 !important;
      line-height: 1.45 !important;
      color: #111111 !important;
      margin: 0 !important;
      padding: 0 !important;
      white-space: pre-wrap !important;
      overflow-wrap: anywhere !important;
      word-break: break-word !important;
    }
  `;

  const host = location.hostname;
  if (
    host.includes('jobmatch') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    location.protocol === 'chrome:' ||
    location.protocol === 'chrome-extension:' ||
    location.protocol === 'moz-extension:'
  ) {
    return;
  }

  const state = {
    open: false,
    loading: false,
    autofilling: false,
    error: null,
    note: null,
    data: null,
    profileOpen: false,
    loadedOnce: false,
  };

  const root = document.createElement('div');
  root.id = 'jobmatch-autofill-root';
  // Limit inheritable ATS resets before they reach the shadow tree.
  root.setAttribute(
    'style',
    [
      'all: initial',
      'display: block',
      'position: fixed',
      'inset: 0',
      'width: 100%',
      'height: 100%',
      'margin: 0',
      'padding: 0',
      'border: 0',
      'overflow: visible',
      'pointer-events: none',
      'z-index: 2147483646',
      'font-family: ui-sans-serif, system-ui, sans-serif',
      'font-size: 14px',
      'line-height: 1.45',
      'color: #111',
      'background: transparent',
    ].join(';'),
  );
  document.documentElement.appendChild(root);

  const shadow = root.attachShadow({ mode: 'closed' });
  const css = document.createElement('style');
  css.textContent = DRAWER_CSS;
  shadow.appendChild(css);

  const panel = document.createElement('div');
  panel.className = 'jm-shell';
  shadow.appendChild(panel);

  function api(path, method, body) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { type: 'JOBMATCH_API', path, method, body },
        (response) => resolve(response || { ok: false, error: 'No response from extension' }),
      );
    });
  }

  async function loadAssist() {
    state.loading = true;
    state.error = null;
    render();
    const res = await api(`/api/extension/assist?applyUrl=${encodeURIComponent(location.href)}`);
    state.loading = false;
    state.loadedOnce = true;
    if (!res.ok) {
      state.error = res.error || 'Could not load autofill data';
      state.data = null;
    } else {
      state.data = res.data;
    }
    render();
  }

  async function runAutofill() {
    const plan = state.data?.session?.fillPlan || buildFallbackPlan(state.data);
    if (!plan.length) {
      state.error = 'No fill-plan fields yet. Complete your JobMatch profile / draft first.';
      render();
      return;
    }
    state.autofilling = true;
    state.error = null;
    state.note = null;
    render();
    const result = window.__jobmatchFillPageFields?.(plan) || { filled: [], missed: plan.map((f) => f.id) };
    state.autofilling = false;
    const total = plan.length;
    const filled = result.filled.length;
    state.note = `Filled ${filled}/${total} field(s) on this page. Review and submit yourself — we never auto-submit.`;
    if (result.missed.length) {
      state.error = `Could not map: ${result.missed.slice(0, 4).join(', ')}${result.missed.length > 4 ? '…' : ''}. Use Copy on those fields.`;
    }
    render();
  }

  function buildFallbackPlan(data) {
    if (!data) return [];
    const profile = data.profile || {};
    const user = data.user || {};
    const fields = [];
    const name = user.name || '';
    if (name) fields.push({ id: 'full_name', label: 'Full name', value: name });
    if (user.email) fields.push({ id: 'email', label: 'Email', value: user.email });
    if (profile.phone) fields.push({ id: 'phone', label: 'Phone', value: profile.phone });
    if (profile.headline) fields.push({ id: 'headline', label: 'Headline', value: profile.headline });
    if (profile.skills?.length) {
      fields.push({
        id: 'skills',
        label: 'Skills',
        value: profile.skills.map((s) => s.name).filter(Boolean).join(', '),
      });
    }
    return fields;
  }

  function fieldList() {
    return state.data?.session?.fillPlan || buildFallbackPlan(state.data);
  }

  function render() {
    const open = state.open;
    const data = state.data;
    const companyName = data?.job?.company?.name || 'JobMatch Copilot';
    const jobTitle = data?.job?.title || 'Apply page';
    const fields = fieldList();
    const filledHint = state.note ? extractFilledCount(state.note) : 0;
    const pct = fields.length ? Math.round((filledHint / fields.length) * 100) : 0;

    panel.innerHTML = `
      <button class="jm-tab" type="button" title="Toggle JobMatch Autofill">${open ? '›' : '‹'} JM</button>
      <div class="jm-drawer ${open ? 'is-open' : ''}">
        <div class="jm-header">
          <div class="jm-brand">
            <div class="jm-mark" aria-hidden="true"></div>
            <div class="jm-brand-text">
              <div class="jm-title">JobMatch <span class="jm-title-accent">Copilot</span></div>
              <div class="jm-sub">${escapeHtml(companyName)} · ${escapeHtml(jobTitle)}</div>
            </div>
          </div>
          <button class="jm-icon-btn" type="button" data-action="close" aria-label="Collapse">›</button>
        </div>
        <div class="jm-body">
          <button class="jm-primary" type="button" data-action="autofill" ${state.loading || state.autofilling ? 'disabled' : ''}>
            ${state.autofilling ? 'Autofilling…' : 'Autofill'}
          </button>
          <div class="jm-help">Fills this page's form from your JobMatch profile / fill plan. Never submits.</div>
          <button class="jm-link" type="button" data-action="profile">Your Autofill Information</button>
          ${state.loading ? '<div class="jm-muted">Loading fill plan…</div>' : ''}
          ${
            fields.length
              ? `<div class="jm-progress">
                   <div class="jm-progress-label"><span>Form fields</span><span class="jm-progress-pct">${pct}%</span></div>
                   <div class="jm-bar"><div class="jm-bar-fill" style="width:${pct}%"></div></div>
                 </div>
                 <div class="jm-fields">${fields
                   .map(
                     (f) => `<div class="jm-field">
                       <div class="jm-field-main">
                         <div class="jm-field-label">${escapeHtml(f.label)}</div>
                         <div class="jm-field-value">${escapeHtml(truncate(f.value || 'Empty', 120))}</div>
                       </div>
                       ${f.value ? `<button class="jm-copy" type="button" data-copy="${escapeAttr(f.value)}">Copy</button>` : ''}
                     </div>`,
                   )
                   .join('')}</div>`
              : '<div class="jm-muted">No fields yet. Connect the extension and complete your JobMatch profile.</div>'
          }
          ${state.note ? `<div class="jm-note">${escapeHtml(state.note)}</div>` : ''}
          ${state.error ? `<div class="jm-error">${escapeHtml(state.error)}</div>` : ''}
          ${
            !data
              ? ''
              : data.matched
                ? '<div class="jm-muted">Matched a JobMatch job for this apply URL.</div>'
                : `<div class="jm-muted">${escapeHtml(data.message || '')}</div>`
          }
        </div>
      </div>
      ${
        state.profileOpen
          ? `<div class="jm-modal">
              <div class="jm-modal-card">
                <div class="jm-modal-head">
                  <div class="jm-modal-title">Your Autofill Information</div>
                  <button class="jm-icon-btn" type="button" data-action="close-profile">×</button>
                </div>
                <div class="jm-modal-body">${renderProfile(data)}</div>
              </div>
            </div>`
          : ''
      }
    `;

    panel.querySelector('.jm-tab')?.addEventListener('click', () => {
      state.open = !state.open;
      if (state.open && !state.loadedOnce) void loadAssist();
      else render();
    });
    panel.querySelector('[data-action="close"]')?.addEventListener('click', () => {
      state.open = false;
      render();
    });
    panel.querySelector('[data-action="autofill"]')?.addEventListener('click', () => {
      void runAutofill();
    });
    panel.querySelector('[data-action="profile"]')?.addEventListener('click', () => {
      state.profileOpen = true;
      render();
    });
    panel.querySelector('[data-action="close-profile"]')?.addEventListener('click', () => {
      state.profileOpen = false;
      render();
    });
    panel.querySelectorAll('[data-copy]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.getAttribute('data-copy') || '');
          btn.textContent = 'Copied';
          setTimeout(() => {
            btn.textContent = 'Copy';
          }, 1200);
        } catch {
          // ignore
        }
      });
    });
  }

  function renderProfile(data) {
    const p = data?.profile;
    const u = data?.user;
    if (!p && !u) return '<div class="jm-muted">Profile unavailable.</div>';
    const rows = [
      ['Name', u?.name],
      ['Email', u?.email],
      ['Headline', p?.headline],
      ['Summary', p?.summary],
      ['Phone', p?.phone],
      ['City', p?.city],
      ['Country', p?.country],
      ['LinkedIn', p?.linkedinUrl],
      ['GitHub', p?.githubUrl],
      ['Skills', (p?.skills || []).map((s) => s.name).filter(Boolean).join(', ')],
    ];
    return `<div class="jm-modal-grid">${rows
      .map(
        ([label, value]) =>
          `<div class="jm-profile-item">
             <div class="jm-profile-label">${escapeHtml(label)}</div>
             <div class="jm-profile-value">${escapeHtml(value || '—')}</div>
           </div>`,
      )
      .join('')}</div>`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function escapeAttr(value) {
    return escapeHtml(value).replace(/'/g, '&#39;');
  }
  function truncate(value, n) {
    return value.length > n ? `${value.slice(0, n - 1)}…` : value;
  }
  function extractFilledCount(note) {
    const m = /Filled\s+(\d+)\//.exec(note);
    return m ? Number(m[1]) : 0;
  }

  render();
})();
