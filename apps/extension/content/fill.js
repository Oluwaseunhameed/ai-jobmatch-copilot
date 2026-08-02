/** Selector map mirrored from packages/job-search field-map (fill-only). */
const SELECTORS = {
  full_name: [
    'input[name*="name" i]:not([type="hidden"])',
    'input[id*="name" i]:not([type="hidden"])',
    'input[autocomplete="name"]',
    'input[placeholder*="full name" i]',
    'input[placeholder*="name" i]',
    'input[aria-label*="name" i]',
  ],
  email: [
    'input[type="email"]',
    'input[name*="email" i]',
    'input[id*="email" i]',
    'input[autocomplete="email"]',
    'input[placeholder*="email" i]',
  ],
  phone: [
    'input[type="tel"]',
    'input[name*="phone" i]',
    'input[id*="phone" i]',
    'input[autocomplete="tel"]',
    'input[placeholder*="phone" i]',
  ],
  headline: [
    'input[name*="headline" i]',
    'input[placeholder*="headline" i]',
    'input[name*="title" i]',
    'textarea[name*="summary" i]',
  ],
  cover_letter: [
    'textarea[name*="cover" i]',
    'textarea[id*="cover" i]',
    'textarea[placeholder*="cover" i]',
    'textarea[aria-label*="cover" i]',
    'textarea[name*="letter" i]',
  ],
  skills: [
    'textarea[name*="skill" i]',
    'input[name*="skill" i]',
    'textarea[placeholder*="skill" i]',
  ],
};

function selectorsForField(field) {
  if (SELECTORS[field.id]) return SELECTORS[field.id];
  if (String(field.id).startsWith('answer_')) {
    return [
      'textarea[name*="answer" i]',
      'textarea[name*="question" i]',
      'textarea[id*="additional" i]',
      'textarea',
    ];
  }
  const label = (field.label || field.id || '').replace(/["\\]/g, '');
  return [
    `input[name*="${field.id}" i]`,
    `textarea[name*="${field.id}" i]`,
    `input[placeholder*="${label}" i]`,
    `textarea[placeholder*="${label}" i]`,
    `input[aria-label*="${label}" i]`,
    `textarea[aria-label*="${label}" i]`,
  ];
}

function setNativeValue(el, value) {
  const proto =
    el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
  if (descriptor?.set) descriptor.set.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
}

/**
 * Fill visible form fields on the current page. Never clicks Submit/Apply.
 * @returns {{ filled: string[], missed: string[] }}
 */
function fillPageFields(fillPlan) {
  const filled = [];
  const missed = [];

  for (const field of fillPlan || []) {
    const value = String(field.value ?? '');
    if (!value.trim()) {
      missed.push(field.id);
      continue;
    }
    let wrote = false;
    for (const selector of selectorsForField(field)) {
      const nodes = Array.from(document.querySelectorAll(selector));
      const el = nodes.find(
        (node) =>
          node instanceof HTMLInputElement ||
          node instanceof HTMLTextAreaElement
            ? !node.disabled && node.type !== 'hidden' && node.offsetParent !== null
            : false,
      );
      if (!el) continue;
      try {
        setNativeValue(el, value);
        filled.push(field.id);
        wrote = true;
        break;
      } catch {
        // try next selector
      }
    }
    if (!wrote) missed.push(field.id);
  }

  return { filled, missed };
}

window.__jobmatchFillPageFields = fillPageFields;
