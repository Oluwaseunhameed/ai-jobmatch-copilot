import type { ApplyFillAttemptDto, ApplyFillFieldDto, AtsVendor } from '@jobmatch/types';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

import { atsVendorLabel } from './ats-detect';
import { buildSelectorPlan } from './field-map';

type PlaywrightChromium = {
  launch: (options?: {
    headless?: boolean;
    args?: string[];
  }) => Promise<{
    newPage: () => Promise<{
      goto: (url: string, opts?: { waitUntil?: string; timeout?: number }) => Promise<unknown>;
      locator: (selector: string) => {
        first: () => {
          count: () => Promise<number>;
          fill: (value: string, opts?: { timeout?: number }) => Promise<void>;
        };
      };
    }>;
    close: () => Promise<void>;
  }>;
};

async function loadPlaywright(): Promise<{ chromium: PlaywrightChromium }> {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    '/opt/playwright/node_modules/playwright',
    'playwright',
  ].filter((value): value is string => Boolean(value));

  const errors: string[] = [];

  for (const candidate of candidates) {
    try {
      if (candidate.startsWith('/')) {
        const mod = (await import(pathToFileURL(`${candidate}/index.js`).href)) as {
          chromium: PlaywrightChromium;
        };
        return { chromium: mod.chromium };
      }

      // Avoid webpack static analysis of playwright (browser binaries).
      const dynamicImport = new Function('specifier', 'return import(specifier)') as (
        specifier: string,
      ) => Promise<{ chromium: PlaywrightChromium }>;
      try {
        const mod = await dynamicImport(candidate);
        return { chromium: mod.chromium };
      } catch {
        const require = createRequire(typeof __filename !== 'undefined' ? __filename : process.cwd());
        const mod = require(candidate) as { chromium: PlaywrightChromium };
        return { chromium: mod.chromium };
      }
    } catch (error) {
      errors.push(
        `${candidate}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(`Cannot load playwright (${errors.join(' | ')})`);
}

export type RunAtsFillInput = {
  applyUrl: string;
  fillPlan: ApplyFillFieldDto[];
  vendor: AtsVendor;
  /** When true, only plan selectors — do not launch Chromium. */
  dryRun?: boolean;
  headless?: boolean;
};

/**
 * Fill-only Playwright assist. Never clicks Submit / Apply.
 * Live ATS hosts require APPLY_AUTOMATION_LIVE=1 (or fixture URLs).
 */
export async function runAtsFill(input: RunAtsFillInput): Promise<ApplyFillAttemptDto> {
  const started = Date.now();
  const plan = buildSelectorPlan(input.fillPlan);
  const at = new Date().toISOString();

  if (input.dryRun) {
    return {
      vendor: input.vendor,
      ok: plan.length > 0,
      filled: plan.map((p) => p.fieldId),
      errors: plan.length ? [] : ['No fill-plan fields to map'],
      durationMs: Date.now() - started,
      at,
      browserRan: false,
    };
  }

  const allowed =
    input.vendor === 'fixture' || process.env.APPLY_AUTOMATION_LIVE === '1';

  if (!allowed) {
    return {
      vendor: input.vendor,
      ok: false,
      filled: [],
      errors: [
        `${atsVendorLabel(input.vendor)} fill is gated. Set APPLY_AUTOMATION_LIVE=1 for live ATS fill-only (never auto-submit), or use /apply-fixture.`,
      ],
      durationMs: Date.now() - started,
      at,
      browserRan: false,
    };
  }

  try {
    const { chromium } = await loadPlaywright();
    const browser = await chromium.launch({
      headless: input.headless !== false,
      // Docker / free-tier containers need these; harmless locally.
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });
    const page = await browser.newPage();
    const filled: string[] = [];
    const errors: string[] = [];

    try {
      await page.goto(input.applyUrl, { waitUntil: 'domcontentloaded', timeout: 45_000 });

      for (const field of plan) {
        let wrote = false;
        for (const selector of field.selectors) {
          try {
            const locator = page.locator(selector).first();
            if ((await locator.count()) === 0) continue;
            await locator.fill(field.value, { timeout: 3_000 });
            filled.push(field.fieldId);
            wrote = true;
            break;
          } catch {
            // try next selector
          }
        }
        if (!wrote) {
          errors.push(`Could not locate field: ${field.label}`);
        }
      }

      // Hard rule: never click submit/apply buttons.
    } finally {
      await browser.close();
    }

    return {
      vendor: input.vendor,
      ok: filled.length > 0,
      filled,
      errors,
      durationMs: Date.now() - started,
      at,
      browserRan: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      vendor: input.vendor,
      ok: false,
      filled: [],
      errors: [`Playwright unavailable or failed: ${message}`],
      durationMs: Date.now() - started,
      at,
      browserRan: false,
    };
  }
}
