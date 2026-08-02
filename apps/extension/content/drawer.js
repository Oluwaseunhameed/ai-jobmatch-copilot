(() => {
  if (window.__jobmatchDrawerInjected) return;
  window.__jobmatchDrawerInjected = true;

  const DRAWER_CSS = `
    :host { all: initial; }
    .jm-shell { position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    .jm-tab { pointer-events: auto; position: fixed; top: 40%; right: 0; transform: translateY(-50%); border: 0; background: #0f766e; color: #fff; padding: 10px 8px; border-radius: 8px 0 0 8px; cursor: pointer; font-size: 12px; font-weight: 700; letter-spacing: .02em; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
    .jm-drawer { pointer-events: auto; position: fixed; top: 0; right: 0; height: 100vh; width: min(380px, 100vw); background: #fafafa; color: #111; border-left: 1px solid #e5e5e5; box-shadow: -12px 0 40px rgba(0,0,0,.12); transform: translateX(105%); transition: transform .22s ease; display: flex; flex-direction: column; }
    .jm-drawer.is-open { transform: translateX(0); }
    .jm-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 14px; border-bottom: 1px solid #e8e8e8; background: #fff; }
    .jm-brand { display: flex; gap: 10px; align-items: center; min-width: 0; }
    .jm-mark { width: 28px; height: 28px; border-radius: 8px; background: #0f766e; flex-shrink: 0; }
    .jm-title { font-size: 14px; font-weight: 700; }
    .jm-title span { color: #0f766e; }
    .jm-sub { font-size: 11px; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 240px; }
    .jm-icon-btn { border: 0; background: transparent; font-size: 20px; cursor: pointer; color: #444; }
    .jm-body { padding: 14px; overflow: auto; display: flex; flex-direction: column; gap: 10px; }
    .jm-primary { height: 44px; border: 0; border-radius: 10px; background: #0f766e; color: #fff; font-weight: 700; cursor: pointer; }
    .jm-primary:disabled { opacity: .6; cursor: default; }
    .jm-help, .jm-muted, .jm-note { font-size: 12px; color: #666; line-height: 1.45; margin: 0; }
    .jm-link { border: 0; background: transparent; color: #0f766e; text-align: left; padding: 0; cursor: pointer; font-size: 13px; font-weight: 600; text-decoration: underline; }
    .jm-progress-label { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
    .jm-bar { height: 8px; background: #e8e8e8; border-radius: 99px; overflow: hidden; }
    .jm-bar i { display: block; height: 100%; background: #0f766e; }
    .jm-fields { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 8px; }
    .jm-fields li { display: flex; gap: 8px; align-items: flex-start; justify-content: space-between; border: 1px solid #e8e8e8; background: #fff; border-radius: 10px; padding: 10px; }
    .jm-fields strong { font-size: 13px; }
    .jm-fields p { margin: 4px 0 0; font-size: 12px; color: #666; }
    .jm-fields button { border: 1px solid #ddd; background: #fff; border-radius: 8px; padding: 6px 8px; font-size: 11px; cursor: pointer; }
    .jm-error { color: #b91c1c; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 8px 10px; font-size: 12px; }
    .jm-modal { pointer-events: auto; position: fixed; inset: 0; background: rgba(0,0,0,.35); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .jm-modal-card { width: min(560px, 100%); max-height: 85vh; overflow: auto; background: #fff; border-radius: 16px; padding: 18px; box-shadow: 0 20px 60px rgba(0,0,0,.25); }
    .jm-modal-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .jm-modal-head h2 { margin: 0; font-size: 18px; }
    .jm-modal-head button { border: 0; background: transparent; font-size: 22px; cursor: pointer; }
    .jm-modal-body dl { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 14px 0 0; }
    .jm-modal-body dl > div { border: 1px solid #eee; border-radius: 10px; padding: 8px 10px; }
    .jm-modal-body dt { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #888; }
    .jm-modal-body dd { margin: 4px 0 0; font-size: 13px; white-space: pre-wrap; }
  `;

  // Skip JobMatch itself and obvious non-apply chrome pages.
  const host = location.hostname;
  if (
    host.includes('jobmatch') ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    location.protocol === 'chrome:' ||
    location.protocol === 'chrome-extension:'
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
  document.documentElement.appendChild(root);

  const shadow = root.attachShadow({ mode: 'open' });
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
    const plan = state.data?.session?.fillPlan || buildFallbackPlan(state.data);
    return plan;
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
      <aside class="jm-drawer ${open ? 'is-open' : ''}">
        <header class="jm-header">
          <div class="jm-brand">
            <div class="jm-mark" aria-hidden="true"></div>
            <div>
              <div class="jm-title">JobMatch <span>Copilot</span></div>
              <div class="jm-sub">${escapeHtml(companyName)} · ${escapeHtml(jobTitle)}</div>
            </div>
          </div>
          <button class="jm-icon-btn" type="button" data-action="close" aria-label="Collapse">›</button>
        </header>
        <div class="jm-body">
          <button class="jm-primary" type="button" data-action="autofill" ${state.loading || state.autofilling ? 'disabled' : ''}>
            ${state.autofilling ? 'Autofilling…' : 'Autofill'}
          </button>
          <p class="jm-help">Fills this page's form from your JobMatch profile / fill plan. Never submits.</p>
          <button class="jm-link" type="button" data-action="profile">Your Autofill Information</button>
          ${state.loading ? '<p class="jm-muted">Loading fill plan…</p>' : ''}
          ${
            fields.length
              ? `<div class="jm-progress"><div class="jm-progress-label"><span>Form fields</span><strong>${pct}%</strong></div><div class="jm-bar"><i style="width:${pct}%"></i></div></div>
                 <ul class="jm-fields">${fields
                   .map(
                     (f) => `<li>
                       <div><strong>${escapeHtml(f.label)}</strong>
                       <p>${escapeHtml(truncate(f.value || 'Empty', 120))}</p></div>
                       ${f.value ? `<button type="button" data-copy="${escapeAttr(f.value)}">Copy</button>` : ''}
                     </li>`,
                   )
                   .join('')}</ul>`
              : '<p class="jm-muted">No fields yet. Connect the extension and complete your JobMatch profile.</p>'
          }
          ${state.note ? `<p class="jm-note">${escapeHtml(state.note)}</p>` : ''}
          ${state.error ? `<p class="jm-error">${escapeHtml(state.error)}</p>` : ''}
          ${
            !data
              ? ''
              : data.matched
                ? '<p class="jm-muted">Matched a JobMatch job for this apply URL.</p>'
                : `<p class="jm-muted">${escapeHtml(data.message || '')}</p>`
          }
        </div>
      </aside>
      ${
        state.profileOpen
          ? `<div class="jm-modal">
              <div class="jm-modal-card">
                <div class="jm-modal-head">
                  <h2>Your Autofill Information</h2>
                  <button type="button" data-action="close-profile">×</button>
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
    if (!p && !u) return '<p class="jm-muted">Profile unavailable.</p>';
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
    return `<dl>${rows
      .map(
        ([label, value]) =>
          `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || '—')}</dd></div>`,
      )
      .join('')}</dl>`;
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
