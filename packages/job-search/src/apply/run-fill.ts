import type { ApplyFillAttemptDto, ApplyFillFieldDto, AtsVendor } from '@jobmatch/types';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

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

/**
 * Load Playwright via createRequire from absolute on-disk paths only.
 *
 * Never use bare `import('playwright')` from Next server chunks — Node ESM
 * resolves that relative to the chunk file and ignores NODE_PATH.
 */
function loadPlaywright(): { chromium: PlaywrightChromium } {
  const candidates = [
    process.env.PLAYWRIGHT_MODULE_PATH,
    '/opt/playwright/node_modules/playwright',
    path.join(process.cwd(), 'node_modules', 'playwright'),
    path.join(process.cwd(), 'apps', 'web', 'node_modules', 'playwright'),
  ].filter((value): value is string => Boolean(value));

  const tried: string[] = [];

  for (const root of candidates) {
    const pkgJson = path.join(root, 'package.json');
    tried.push(pkgJson);
    if (!existsSync(pkgJson)) continue;

    try {
      const require = createRequire(pkgJson);
      const mod = require(root) as { chromium?: PlaywrightChromium };
      if (!mod?.chromium) {
        throw new Error('package loaded but chromium export missing');
      }
      return { chromium: mod.chromium };
    } catch (error) {
      tried.push(
        `${root} → ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    `Playwright not found on disk (absolute require only). Tried: ${tried.join(' | ')}`,
  );
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
    const { chromium } = loadPlaywright();
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
