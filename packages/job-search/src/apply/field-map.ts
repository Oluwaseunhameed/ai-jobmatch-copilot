import type { ApplyFillFieldDto } from '@jobmatch/types';

/** CSS / role hints for fill-only adapters (never used to click Submit). */
export type FieldSelectorPlan = {
  fieldId: string;
  label: string;
  value: string;
  /** Ordered selector candidates tried by Playwright. */
  selectors: string[];
};

const NAME_SELECTORS = [
  'input[name*="name" i]:not([type="hidden"])',
  'input[id*="name" i]:not([type="hidden"])',
  'input[autocomplete="name"]',
  'input[placeholder*="full name" i]',
  'input[placeholder*="name" i]',
  'input[aria-label*="name" i]',
];

const EMAIL_SELECTORS = [
  'input[type="email"]',
  'input[name*="email" i]',
  'input[id*="email" i]',
  'input[autocomplete="email"]',
  'input[placeholder*="email" i]',
];

const HEADLINE_SELECTORS = [
  'input[name*="headline" i]',
  'input[placeholder*="headline" i]',
  'input[name*="title" i]',
  'textarea[name*="summary" i]',
];

const COVER_SELECTORS = [
  'textarea[name*="cover" i]',
  'textarea[id*="cover" i]',
  'textarea[placeholder*="cover" i]',
  'textarea[aria-label*="cover" i]',
  'textarea[name*="letter" i]',
  'textarea',
];

const SKILLS_SELECTORS = [
  'textarea[name*="skill" i]',
  'input[name*="skill" i]',
  'textarea[placeholder*="skill" i]',
];

const ANSWER_SELECTORS = [
  'textarea[name*="answer" i]',
  'textarea[name*="question" i]',
  'textarea[id*="additional" i]',
  'textarea',
];

/**
 * Map approved fill-plan fields to DOM selector candidates for ATS boards.
 */
export function buildSelectorPlan(fillPlan: ApplyFillFieldDto[]): FieldSelectorPlan[] {
  return fillPlan.map((field) => {
    const id = field.id;
    let selectors: string[] = [];
    if (id === 'full_name') selectors = NAME_SELECTORS;
    else if (id === 'email') selectors = EMAIL_SELECTORS;
    else if (id === 'headline') selectors = HEADLINE_SELECTORS;
    else if (id === 'cover_letter') selectors = COVER_SELECTORS;
    else if (id === 'skills') selectors = SKILLS_SELECTORS;
    else if (id.startsWith('answer_')) selectors = ANSWER_SELECTORS;
    else {
      selectors = [
        `input[name*="${cssEscape(id)}" i]`,
        `textarea[name*="${cssEscape(id)}" i]`,
        `input[placeholder*="${cssEscape(field.label)}" i]`,
        `textarea[placeholder*="${cssEscape(field.label)}" i]`,
        `input[aria-label*="${cssEscape(field.label)}" i]`,
        `textarea[aria-label*="${cssEscape(field.label)}" i]`,
      ];
    }

    return {
      fieldId: field.id,
      label: field.label,
      value: field.value,
      selectors,
    };
  });
}

function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&').slice(0, 40);
}
